from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from scraper import scrape_mercadolibre
import uvicorn

app = FastAPI(title="Shopping AI API")

# Habilitar CORS para que el Navegador permita la conexión
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción se debe limitar a los dominios autorizados
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/search")
async def search_product(q: str = Query(..., min_length=2)):
    """
    Busca un producto y devuelve la mejor opción encontrada.
    """
    result = await scrape_mercadolibre(q)
    if result:
        return {
            "status": "success",
            "best_option": result,
            "ai_reasoning": f"He analizado los resultados y '{result['title']}' es la opción más equilibrada entre precio (${result['price']}) y reputación del vendedor ({result['reputation']})."
        }
    return {
        "status": "not_found",
        "message": "No se encontraron ofertas confiables para ese producto."
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
