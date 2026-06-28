"""Entry point — запуск: python start.py"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=5005, reload=False)
