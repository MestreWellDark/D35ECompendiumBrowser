# D35E Advanced Compendium Browser

Navegador avançado de compêndios para **Foundry VTT v13** usando o sistema **D35E 3.1.0** (D&D 3.5e).

## Recursos

- Categorias: **Itens, Magias, Talentos, Habilidades, Classes, Raças, Aprimoramentos, Buffs/Auras e Bestiário**.
- Pesquisa por texto com atualização dinâmica sem perda de foco.
- Filtros específicos para cada categoria.
- Todos os grupos de filtros começam fechados ao abrir o browser e ao trocar de categoria.
- O estado aberto/fechado dos filtros é preservado durante filtragens e re-renders dentro da mesma categoria.
- Filtro por compêndio e por origem (sistema, módulo ou mundo).
- Descoberta automática de novos compêndios instalados; não depende de uma lista fixa de packs.
- Paginação para trabalhar com milhares de entradas sem renderizar tudo de uma vez.
- Usa `getIndex()` para reduzir o custo de abertura.
- Clique em qualquer ponto do cartão para abrir o documento.
- Drag & drop direto para fichas/canvas quando o tipo de documento suporta.
- Integração com atalhos da ficha D35E, redirecionando os browsers nativos para o navegador avançado.

## Instalação pelo manifesto

No Foundry VTT, use o endereço abaixo em **Install Module > Manifest URL**:

```text
https://raw.githubusercontent.com/MestreWellDark/D35ECompendiumBrowser/main/module.json
```

## Instalação manual

1. Baixe o ZIP do repositório pelo botão **Code > Download ZIP**.
2. Extraia o conteúdo para uma pasta chamada `d35e-compendium-browser` em `FoundryVTT/Data/modules/`.
3. Reinicie o Foundry.
4. No mundo D35E, ative **D35E Advanced Compendium Browser** em **Manage Modules**.
5. Abra a aba **Compêndios** e use **Compendium Browser +**.

## Integração com a ficha D35E

O módulo redireciona os principais atalhos nativos da ficha para o browser avançado:

- **Race Compendium** → Raças
- **Class Compendium** → Classes
- **Feats Compendium** → Talentos
- **Spellbook / Deck** → Magias
- **Buffs** → Buffs/Auras
- **Inventory / Add Item** → Itens

Atalhos internos como `actor-first-class` e `actor-race` são preservados porque abrem a classe/raça já possuída pelo ator, em vez de um índice geral de compêndio.

## Compatibilidade

- Foundry VTT: **v13**
- Sistema D35E: **3.1.0**

## Histórico

### v0.1.7

- Padroniza visualmente todos os botões de categoria.
- Remove as contagens laterais das categorias, que antes apareciam somente depois que cada categoria havia sido carregada.
- Evita que o painel mude de aparência conforme o usuário visita Itens, Magias, Talentos e outras categorias.
- A quantidade de resultados continua disponível no contador principal do browser.

### v0.1.6

- Todos os grupos de filtros agora começam **fechados** ao abrir o Compendium Browser.
- Ao trocar de categoria (Itens, Magias, Talentos, Classes etc.), todos os filtros da nova categoria começam fechados.
- Durante a filtragem dentro da mesma categoria, o módulo continua preservando exatamente os grupos que o usuário abriu ou fechou.
- Grupos que aparecem somente depois do carregamento também começam fechados.
- A rolagem dos filtros é reiniciada no topo ao abrir o browser ou trocar de categoria, mas continua preservada durante os re-renders da mesma categoria.

### v0.1.5

- Preserva quais grupos de filtros o usuário deixou abertos ou fechados durante os re-renders.
- Um filtro fechado manualmente não volta a abrir só porque uma opção foi selecionada.
- Um grupo aberto manualmente continua aberto ao selecionar/remover opções.
- O estado é mantido separadamente por categoria (Itens, Magias, Talentos etc.).
- Preserva também a posição vertical da barra de filtros para evitar saltos ao topo.

### v0.1.4

- Corrige a pesquisa que perdia o foco após cada atualização.
- Adiciona debounce de 350 ms na pesquisa.
- Preserva texto, foco e posição do cursor após o re-render.
- Permite abrir documentos clicando em qualquer ponto do cartão.
- Adiciona suporte de teclado com Enter/Espaço no cartão.
- Mantém drag & drop sem abertura acidental ao finalizar o arrasto.

### v0.1.3

- Corrige **Feats Compendium** (`inline:feats:feat:feat:*`).
- Redireciona atalhos `inline:items:*` para Itens preservando filtros.
- Integra Classes, Raças, Magias e Buffs.
- Trata `D35E.spell-schools-domains` como Talentos quando apropriado.
- Intercepta também o botão nativo **Open Browser** do drawer D35E.
- Auditoria dos templates Character/NPC: Inventory, Features, Buffs, Spellbook e Deck.

### v0.1.2

- Move categorias para um painel lateral em grade, removendo a rolagem horizontal.
- Redireciona **Class Compendium** e **Race Compendium** para o browser avançado.
- Integra atalhos nativos de Magias e Buffs.
- Corrige a inserção do botão do browser na aba Compêndios do Foundry v13.

### v0.1.1

- Corrige a exibição do botão **Compendium Browser +** na aba Compêndios.

### v0.1.0

- Primeira versão funcional do navegador por categorias e filtros.
