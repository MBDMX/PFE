import asyncio
import httpx
import json

THUMB_WIDTH = 256

async def test_search(query):
    params = {
        "action":       "query",
        "format":       "json",
        "generator":    "search",
        "gsrnamespace": "6",
        "gsrsearch":    f"filetype:bitmap {query}",
        "gsrlimit":     "12",
        "prop":         "imageinfo",
        "iiprop":       "url|mime",
        "iiurlwidth":   str(THUMB_WIDTH),
    }
    async with httpx.AsyncClient(headers={"User-Agent": "GMAO-PFE/2.0"}) as client:
        resp = await client.get("https://commons.wikimedia.org/w/api.php", params=params)
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        print(f"\nQuery: {query}")
        print(f"Results: {len(pages)}")
        for page in pages.values():
            print(f" - {page.get('title')}")

async def main():
    terms = [
        "electric motor isolated white background product",
        "electric motor",
        "centrifugal pump isolated white background product",
        "centrifugal pump",
        "o-ring seal isolated white background product",
        "o-ring seal"
    ]
    for t in terms:
        await test_search(t)

if __name__ == "__main__":
    asyncio.run(main())
