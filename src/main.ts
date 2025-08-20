// Importando a dependência @kixelated/hang
import HangSupport from "@kixelated/hang/support/element";
import HangWatch from "@kixelated/hang/watch/element";

// Registrar os elementos customizados
// customElements.define('hang-support', HangSupport);
// customElements.define('hang-watch', HangWatch);

export { HangWatch, HangSupport };

// Função principal
function main() {
  console.log('Projeto TypeScript Web iniciado!');
  
  // Usando a dependência @kixelated/hang
  try {
    const watch = document.querySelector("hang-watch") as HangWatch;
    if (watch) {
      // If query params are provided, use it as the broadcast name.
      // const urlParams = new URLSearchParams(window.location.search);
      // const name = urlParams.get("name") ?? "demo/bbb";
      watch.setAttribute("url", `http://localhost:4443/demo/bbb.hang`);
      console.log('Elemento hang-watch configurado com sucesso!');
    } else {
      console.warn('Elemento hang-watch não encontrado');
    }
  } catch (error) {
    console.error('Erro ao carregar @kixelated/hang:', error);
  }

  // Adicionar algum conteúdo à página
  const app = document.getElementById('app');
  if (app) {
    const statusDiv = document.createElement('div');
    statusDiv.innerHTML = `
      <div style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 5px;">
        <h3>Status do Projeto</h3>
        <p>✅ TypeScript configurado</p>
        <p>✅ Vite configurado</p>
        <p>✅ Dependência @kixelated/hang importada</p>
        <p>Data de criação: ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
    `;
    app.appendChild(statusDiv);
  }
}

// Executar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', main);
