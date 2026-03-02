import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from bs4 import BeautifulSoup

async def scrape_mercadolibre(product_name):
    async with async_playwright() as p:
        # Lanzamos con headless=True, pero podrías cambiarlo a False para ver qué pasa
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)
        
        print(f"Buscando en MercadoLibre: {product_name}...")
        # Corregimos 'lista' por 'listado' que es el estándar de MercadoLibre
        search_url = f"https://listado.mercadolibre.com.ar/{product_name.replace(' ', '-')}"
        
        try:
            # Aumentar el timeout y usar wait_until='load' para evitar cortes de DNS prematuros
            await page.goto(search_url, wait_until="load", timeout=60000)
            # Esperar un poco a que carguen los resultados dinámicos
            await page.wait_for_timeout(2000)
            
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            items = []
            # Intentar varios selectores comunes de Meli
            results = soup.select('.ui-search-result__wrapper') or \
                      soup.select('.ui-search-layout__item') or \
                      soup.select('.poly-card')
            
            print(f"Resultados encontrados en DOM: {len(results)}")
            
            for res in results[:15]:
                # Selectores más amplios para el título
                title_elem = res.select_one('.ui-search-item__title') or \
                             res.select_one('.poly-component__title') or \
                             res.select_one('h2')
                
                # Selectores para el precio
                price_elem = res.select_one('.poly-price__number .andes-money-amount__fraction') or \
                             res.select_one('.price-tag-fraction') or \
                             res.select_one('.andes-money-amount__fraction')
                
                # Selector para el link
                link_elem = res.select_one('a.ui-search-link') or \
                            res.select_one('a.poly-component__title') or \
                            res.select_one('a')
                
                if title_elem and price_elem:
                    title_text = title_elem.get_text().strip()
                    price_text = price_elem.get_text().replace('.', '').replace(',', '').strip()
                    link_url = link_elem['href'] if link_elem and link_elem.has_attr('href') else ""
                    
                    # Filtro de seguridad: El precio debe ser un número coherente
                    try:
                        price_int = int(price_text)
                    except:
                        continue

                    # Determinar reputación (MercadoLíder, Full, etc)
                    is_full = "full" in str(res).lower()
                    reputation = "High (Full)" if is_full else "Standard"
                    
                    items.append({
                        "title": title_text,
                        "price": price_int,
                        "link": link_url,
                        "reputation": reputation
                    })
            
            if items:
                # Ranking: Priorizar Full/Reputación y luego el menor precio
                items.sort(key=lambda x: (0 if "High" in x['reputation'] else 1, x['price']))
                print(f"Mejor opción seleccionada: {items[0]['title']} a ${items[0]['price']}")
                return items[0]
            
            return None
            
        except Exception as e:
            print(f"Error durante el scraping: {e}")
            return None
        finally:
            await browser.close()

if __name__ == "__main__":
    # Test rápido
    async def main():
        product = "iphone 13"
        best = await scrape_mercadolibre(product)
        if best:
            print(f"\n--- MEJOR OPCIÓN ENCONTRADA ---")
            print(f"Producto: {best['title']}")
            print(f"Precio: ${best['price']}")
            print(f"Link: {best['link']}")
        else:
            print("No se encontraron resultados confiables.")

    asyncio.run(main())
