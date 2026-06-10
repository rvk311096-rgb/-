import httpx
import asyncio
from datetime import datetime, date, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class BitrixClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def _get(self, endpoint: str, params: dict = None) -> dict:
        url = f"{self.base_url}/{endpoint}"
        if params is None:
            params = {}
        params["api_key"] = self.api_key
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, params=params, headers=self.headers)
            resp.raise_for_status()
            return resp.json()

    async def _post(self, endpoint: str, data: dict = None) -> dict:
        url = f"{self.base_url}/{endpoint}"
        if data is None:
            data = {}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=data, headers=self.headers)
            resp.raise_for_status()
            return resp.json()

    async def get_users(self) -> list[dict]:
        """Get all active users (managers/accounts)."""
        try:
            result = await self._get("user.get", {"ACTIVE": True, "limit": 500})
            return result.get("result", [])
        except Exception as e:
            logger.error(f"Error fetching users: {e}")
            return []

    async def get_activities(
        self,
        date_from: date,
        date_to: date,
        responsible_id: Optional[int] = None,
        type_ids: Optional[list[int]] = None,
    ) -> list[dict]:
        """Fetch CRM activities for a date range."""
        filter_params = {
            ">=DEADLINE": date_from.strftime("%Y-%m-%dT00:00:00"),
            "<=DEADLINE": date_to.strftime("%Y-%m-%dT23:59:59"),
        }
        if responsible_id:
            filter_params["RESPONSIBLE_ID"] = responsible_id
        if type_ids:
            filter_params["TYPE_ID"] = type_ids

        try:
            result = await self._post(
                "crm.activity.list",
                {
                    "filter": filter_params,
                    "select": ["ID", "TYPE_ID", "RESPONSIBLE_ID", "DEADLINE", "COMPLETED", "SUBJECT"],
                    "order": {"DEADLINE": "ASC"},
                    "start": 0,
                },
            )
            return result.get("result", [])
        except Exception as e:
            logger.error(f"Error fetching activities: {e}")
            return []

    async def get_tasks(
        self,
        date_from: date,
        date_to: date,
        responsible_id: Optional[int] = None,
        overdue_only: bool = False,
    ) -> list[dict]:
        """Fetch tasks."""
        filter_params: dict = {}
        if responsible_id:
            filter_params["RESPONSIBLE_ID"] = responsible_id

        if overdue_only:
            filter_params["<=DEADLINE"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            filter_params["STATUS"] = [2, 3]  # in progress / waiting
        else:
            filter_params[">=DEADLINE"] = date_from.strftime("%Y-%m-%dT00:00:00")
            filter_params["<=DEADLINE"] = date_to.strftime("%Y-%m-%dT23:59:59")

        try:
            result = await self._post(
                "tasks.task.list",
                {
                    "filter": filter_params,
                    "select": ["ID", "TITLE", "RESPONSIBLE_ID", "DEADLINE", "STATUS", "CLOSED_DATE"],
                    "order": {"DEADLINE": "ASC"},
                    "start": 0,
                },
            )
            tasks = result.get("result", {})
            if isinstance(tasks, dict):
                return tasks.get("tasks", [])
            return tasks
        except Exception as e:
            logger.error(f"Error fetching tasks: {e}")
            return []

    async def get_daily_stats(self, target_date: date) -> dict:
        """Aggregate daily stats for all users."""
        users = await self.get_users()

        # Bitrix24 activity type IDs
        CALL_TYPE = [2]        # CALL
        MESSAGE_TYPE = [4, 5]  # EMAIL / MESSAGE
        MEETING_TYPE = [1]     # MEETING

        # Fetch all activities and tasks concurrently
        calls_task = self.get_activities(target_date, target_date, type_ids=CALL_TYPE)
        messages_task = self.get_activities(target_date, target_date, type_ids=MESSAGE_TYPE)
        meetings_task = self.get_activities(target_date, target_date, type_ids=MEETING_TYPE)
        overdue_task = self.get_tasks(target_date, target_date, overdue_only=True)

        calls, messages, meetings, overdue = await asyncio.gather(
            calls_task, messages_task, meetings_task, overdue_task
        )

        # Build per-user stats
        user_map = {u["ID"]: u for u in users}
        stats: dict[str, dict] = {}

        for uid, user in user_map.items():
            name = f"{user.get('LAST_NAME', '')} {user.get('NAME', '')}".strip() or f"User {uid}"
            stats[uid] = {
                "id": uid,
                "name": name,
                "department": user.get("UF_DEPARTMENT", []),
                "calls": 0,
                "messages": 0,
                "meetings": 0,
                "overdue_tasks": 0,
            }

        def count_by_user(items: list[dict], field: str, uid_field: str = "RESPONSIBLE_ID") -> None:
            for item in items:
                uid = str(item.get(uid_field, ""))
                if uid in stats:
                    stats[uid][field] += 1

        count_by_user(calls, "calls")
        count_by_user(messages, "messages")
        count_by_user(meetings, "meetings")
        count_by_user(overdue, "overdue_tasks")

        return {
            "date": target_date.isoformat(),
            "users": list(stats.values()),
            "totals": {
                "calls": sum(v["calls"] for v in stats.values()),
                "messages": sum(v["messages"] for v in stats.values()),
                "meetings": sum(v["meetings"] for v in stats.values()),
                "overdue_tasks": sum(v["overdue_tasks"] for v in stats.values()),
                "total_users": len(users),
            },
        }
