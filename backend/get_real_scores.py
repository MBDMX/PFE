import asyncio
from app.core.ml_service import ml_service
from app.db.session import get_db

async def main():
    async for db in get_db():
        scores = await ml_service.predict_health_scores(db)
        for s in scores[:5]:
            print(f"Machine: {s['name']} (ID: {s['id']})")
            print(f"  MTBF: {s['mtbf_days']} days | MTTR: {s['mttr_hours']} hrs")
            print(f"  Score: {s['score']} | Risk: {s['risk']}")
            print(f"  Summary: {s['human_summary']}")
            print("-" * 50)
        break

if __name__ == "__main__":
    asyncio.run(main())
