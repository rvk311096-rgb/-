import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

ENTITY_CODE = "idea_bank_v1"

STATUSES = {"new", "review", "approved", "rejected"}


class BitrixClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.api_key  = api_key
        self.headers  = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type":  "application/json",
        }

    async def _call(self, method: str, params: dict = None) -> dict:
        url  = f"{self.base_url}/{method}"
        data = params or {}
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.post(url, json=data, headers=self.headers)
            r.raise_for_status()
            return r.json()

    # ── Bitrix24 user.current via user auth token ────────────────────────────

    async def user_current(self, auth_token: str) -> dict:
        """Validate user auth token and return user data."""
        async with httpx.AsyncClient(timeout=15.0) as c:
            r = await c.get(
                f"{self.base_url}/user.current",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
            r.raise_for_status()
            result = r.json()
        return result.get("result", result)

    # ── Entity storage bootstrap ─────────────────────────────────────────────

    async def _ensure_entity(self) -> None:
        """Create the entity storage if it doesn't exist yet."""
        try:
            await self._call("entity.add", {
                "ENTITY": ENTITY_CODE,
                "NAME":   "Банк идей",
                "ACCESS": {"AU": "W"},   # authenticated users can write
            })
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                pass  # already exists
            else:
                raise

    # ── Ideas CRUD ────────────────────────────────────────────────────────────

    async def get_ideas(self, user_id: Optional[str] = None) -> list[dict]:
        filter_p: dict = {}
        if user_id:
            filter_p["PROPERTY_USER_ID"] = user_id

        try:
            result = await self._call("entity.item.get", {
                "ENTITY": ENTITY_CODE,
                "SORT":   {"DATE_CREATE": "DESC"},
                "FILTER": filter_p,
            })
            items = result.get("result", {})
            if isinstance(items, dict):
                items = items.get("items", [])
            return [self._format(i) for i in (items or [])]
        except Exception as e:
            logger.error(f"get_ideas error: {e}")
            return []

    async def create_idea(
        self,
        user_id: str,
        user_name: str,
        title: str,
        category: str,
        description: str = "",
    ) -> dict:
        await self._ensure_entity()
        result = await self._call("entity.item.add", {
            "ENTITY": ENTITY_CODE,
            "NAME":   title,
            "DETAIL_TEXT": description,
            "PROPERTY_VALUES": {
                "USER_ID":       user_id,
                "USER_NAME":     user_name,
                "CATEGORY":      category,
                "STATUS":        "new",
                "ADMIN_COMMENT": "",
            },
        })
        item_id = result.get("result")
        return {
            "id":            str(item_id),
            "title":         title,
            "description":   description,
            "category":      category,
            "status":        "new",
            "admin_comment": "",
            "user_id":       user_id,
            "user_name":     user_name,
        }

    async def update_idea(self, idea_id: str, status: str,
                          admin_comment: str = "") -> dict:
        if status not in STATUSES:
            raise ValueError(f"Unknown status: {status}")
        await self._call("entity.item.update", {
            "ENTITY": ENTITY_CODE,
            "ID":     int(idea_id),
            "PROPERTY_VALUES": {
                "STATUS":        status,
                "ADMIN_COMMENT": admin_comment,
            },
        })
        return {"id": idea_id, "status": status, "admin_comment": admin_comment}

    async def delete_idea(self, idea_id: str) -> None:
        await self._call("entity.item.delete", {
            "ENTITY": ENTITY_CODE,
            "ID":     int(idea_id),
        })

    # ── Format helper ─────────────────────────────────────────────────────────

    @staticmethod
    def _format(item: dict) -> dict:
        props = item.get("PROPERTY_VALUES", {})
        return {
            "id":            str(item.get("ID", "")),
            "title":         item.get("NAME", ""),
            "description":   item.get("DETAIL_TEXT", ""),
            "category":      props.get("CATEGORY", ""),
            "status":        props.get("STATUS", "new"),
            "admin_comment": props.get("ADMIN_COMMENT", ""),
            "user_id":       str(props.get("USER_ID", "")),
            "user_name":     props.get("USER_NAME", ""),
            "date_create":   item.get("DATE_CREATE", ""),
        }
