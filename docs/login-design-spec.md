# Login Screen — Especificação Oficial de Layout

> **Documento:** `docs/login-design-spec.md`
> **Versão:** 2.0
> **Tela Mestre:** 360×740 px
> **Última atualização:** 2026-07-30

---

## Índice

- [Parte A — Especificação de Design](#parte-a--especificação-de-design)
- [Parte B — Especificação de Implementação](#parte-b--especificação-de-implementação)
- [Parte C — Validação](#parte-c--validação)
- [Parte D — Manutenção](#parte-d--manutenção)

---

# Parte A — Especificação de Design

> Decisões de design puras, sem referência a CSS ou tecnologia.

---

## 1. Princípios da Interface

### 1.1 Identidade Única
A tela de login deve ter a **mesma identidade visual** em qualquer dispositivo. O usuário reconhece a interface como sendo a mesma, independente da resolução.

### 1.2 Escalonamento, Não Reorganização
O layout nunca é reorganizado entre breakpoints. Elementos não mudam de posição relativa, não desaparecem, não surgem. A responsividade apenas **escala** os componentes.

### 1.3 Proporções Preservadas
As proporções entre elementos são fixas. A tela mestre define a referência; desvios são proporcionais, nunca absolutos.

### 1.4 Sem Scroll Vertical
A tela ocupa exatamente 100% da viewport. Conteúdo comprimido é preferível a scroll.

### 1.5 Hierarquia Constante
Logo → Urna → Slogan → Botões → Tagline. Ordem imutável em qualquer resolução.

### 1.6 Espaços Negativos Preservados
Os espaços entre elementos são parte do design e devem ser mantidos proporcionalmente.

### 1.7 Centralização Absoluta
Todos os elementos são centralizados no eixo horizontal. Sem exceções.

### 1.8 Coesão de Ações
Botões de ação no card são visualmente idênticos entre si.

---

## 2. Árvore da Interface

```
LoginWrapper (100% da viewport)
│
├── LoginTop (≈74%)
│   ├── Pattern            — fundo decorativo (camada -1)
│   ├── FloatingDots       — 4 bolinhas decorativas (camada 0)
│   └── LoginTopContent    — conteúdo central (camada 1)
│       ├── Logo           — marca, topo
│       ├── Urna           — imagem central, meio
│       └── Slogan         — texto, fundo
│
└── LoginCard (≈26%)
    ├── CardContent
    │   ├── GoogleButton   — ação primária
    │   └── HowItWorksButton — ação secundária
    └── Tagline            — fechamento visual
```

---

## 3. Hierarquia Visual e Fluxo

### 3.1 Ordem de leitura

| # | Elemento | Função |
|---|---|---|
| 1 | Logo | Identificação da marca |
| 2 | Urna | Compreensão do propósito (votação) |
| 3 | Slogan | Engajamento emocional |
| 4 | Botão Google | Ação principal (login) |
| 5 | Botão Conheça o App | Ação secundária (exploração) |
| 6 | Tagline | Reforço de marca |

### 3.2 Pesos visuais

| Elemento | Peso | Motivo |
|---|---|---|
| Logo | Alto | Cores vibrantes, topo |
| Urna | Médio-alto | Imagem grande, central |
| Slogan | Médio | Bold, duas cores |
| Botões | Médio | Branco + sombra sobre fundo verde |
| Tagline | Baixo | Texto pequeno, opacidade 0.7 |

### 3.3 Fluxo do olhar

```
Topo → Centro → Fundo (natural, sem competição visual)
```

---

## 4. Proporções Oficiais

### 4.1 Metodologia
As proporções são definidas **primeiro como percentual da altura total**, depois convertidas para pixels na tela mestre (360×740). Qualquer nova resolução deve preservar estas proporções.

### 4.2 Distribuição vertical

| Componente | % da tela | px na tela mestre | Métrica |
|---|---|---|---|
| **LoginTop** | 74% | 548px | Altura total menos card |
| ├── padding-top | 0.5% | 4px | Espaço seguro superior |
| ├── Logo (altura) | 13.7% | 101px | 150px / 1.48 (aspect ratio) |
| ├── Gap logo → urna | 7% | 52px | Distribuído por space-between |
| ├── Urna (altura) | 34% | 252px | Limitado por min(50svh, 70vw) |
| ├── Gap urna → slogan | 7% | 52px | Distribuído por space-between |
| ├── Slogan (altura) | 6.8% | 50px | 2 linhas × 20px × 1.2 + 2px gap |
| └── padding-bottom | 5% | 37px | Espaço para respirar antes do card |
| **LoginCard** | 26% | 192px | min-height |
| ├── padding-top | 2.5% | 18.5px | |
| ├── Gap top → botões | ~0.7% | ~5.5px | Espaço de centralização |
| ├── Botão Google | 7.5% | 55.5px | |
| ├── Gap entre botões | 1.5% | 11px | |
| ├── Botão Conheça o App | 7.5% | 55.5px | |
| ├── Gap botões → tagline | 0.8% | 5.9px | |
| ├── Tagline | 2.2% | 16px | |
| └── padding-bottom | 2.5% | 18.5px | |
| **Total** | 100% | 740px | |

> Nota: Gap logo→urna e gap urna→slogan são valores aproximados. Na implementação, `space-between` distribui o espaço restante igualmente entre os dois intervalos.

### 4.3 Distribuição horizontal

| Componente | % largura | Na tela mestre (360px) |
|---|---|---|
| Logo | 41.7% | 150px |
| Urna | 85% | 306px |
| Botões | 85% | 306px (limitado a 380px) |
| Tagline | 100% | 360px |

---

## 5. Sistema de Escalonamento

### 5.1 Função de escala por componente

| Componente | Escala por | Unidade | Fórmula |
|---|---|---|---|
| Logo (largura) | Largura da viewport | `vw` | `35vw` |
| Urna (max-height) | Altura E largura | `min(svh, vw)` | `min(50svh, 70vw)` |
| Slogan (font-size) | Largura da viewport | `vw` | `4.5vw` |
| Card (min-height) | Altura da viewport | `dvh` | `26dvh` |
| Botões (height) | Altura da viewport | `dvh` | `7.5dvh` |
| Botões (font-size) | Largura da viewport | `vw` | `3vw` |
| Tagline (font-size) | Largura da viewport | `vw` | `1.6vw` |
| Espaçamentos | Altura da viewport | `dvh` | `1dvh` a `5dvh` |
| Ícones | Largura da viewport | `vw` | `3.5vw` |

### 5.2 Limites (clamp)

| Componente | Mínimo | Preferido | Máximo |
|---|---|---|---|
| Logo | 150px | 35vw | 280px |
| Slogan | 20px | 4.5vw | 36px |
| Card | 170px | 26dvh | 300px |
| Botões (height) | 44px | 7.5dvh | 60px |
| Botões (font-size) | 13px | 3vw | 19px |
| Botões (border-radius) | 12px | 2.2vw | 18px |
| Google icon | 18px | 3.5vw | 28px |
| Play icon | 22px | 3.5vw | 28px |
| Tagline (font-size) | 11px | 1.6vw | 13px |
| Card padding-top | 14px | 2.5dvh | 24px |
| Card padding-bottom | 16px | 2.5dvh | 24px |
| Top padding-top | 4px | 1dvh | 12px |
| Top padding-bottom | 32px | 5dvh | 60px |
| Botões gap | 10px | 1.5dvh | 16px |
| Tagline margin-top | 4px | 0.8dvh | 12px |
| Card border-radius | — | 32px (top) | — |

### 5.3 Regra geral
> Quando a viewport for menor que o mínimo, o valor **congela** no mínimo.
> Quando a viewport for maior que o máximo, o valor **congela** no máximo.
> Entre os limites, o valor **escala fluidamente** com a viewport.

---

## 6. Prioridades da Responsividade

| # | Regra | Violação |
|---|---|---|
| **P1** | Nunca cortar conteúdo | Texto ou imagem parcialmente ocultos |
| **P2** | Nunca gerar scroll vertical | Barra de rolagem |
| **P3** | Nunca comprimir componentes | Botões com texto truncado |
| **P4** | Preservar espaçamento | Elementos colados |
| **P5** | Preservar alinhamentos | Deslocamento do centro |

### 6.1 Decisão em conflito

| Conflito | Decisão |
|---|---|
| P1 vs P3 | Cortar é pior que comprimir. Reduza escala |
| P2 vs P4 | Scroll é pior que reduzir espaçamento. Reduza gaps |
| P3 vs P5 | Comprimido é pior que desalinhado. Integridade primeiro |

---

## 7. Restrições — Nunca Fazer

### 7.1 Estruturais

- ❌ **Nunca mover a urna** de sua posição entre logo e slogan
- ❌ **Nunca alterar a ordem** dos elementos na árvore
- ❌ **Nunca quebrar o slogan** em mais de duas linhas
- ❌ **Nunca diminuir apenas um botão** — ambos devem sempre ser idênticos
- ❌ **Nunca usar botões com alturas diferentes**
- ❌ **Nunca adicionar scroll vertical** na tela de login

### 7.2 Visuais

- ❌ **Nunca alterar as cores** da paleta oficial
- ❌ **Nunca alterar o alinhamento** — tudo deve estar centralizado
- ❌ **Nunca distorcer o aspect ratio** da urna
- ❌ **Nunca remover a tagline** ou torná-la ilegível
- ❌ **Nunca sobrepor elementos** (tagline sobre botões, etc)

### 7.3 Responsivas

- ❌ **Nunca fazer um elemento desaparecer** em breakpoints específicos (exceção: dots em landscape)
- ❌ **Nunca modificar a identidade visual** entre breakpoints
- ❌ **Nunca adicionar breakpoint** sem justificativa visual comprovada
- ❌ **Nunca usar valores fixos** onde `clamp()` pode cobrir a faixa

---

## 8. Tolerâncias

| Componente | Referência | Tolerância | Limite seguro |
|---|---|---|---|
| Logo (largura 360px) | 150px | ±5% | 142–158px |
| Urna (altura 740px) | 252px | ±5% | 239–265px |
| Card (min-height 740px) | 192px | ±3% | 186–198px |
| Botão (altura 740px) | 55px | ±2% | 54–56px |
| Slogan (font-size 360px) | 20px | ±3% | 19.4–20.6px |
| Espaçamentos verticais | — | ±5% | |
| Tagline (font-size) | 11px | ±5% | 10.5–11.6px |

> Ultrapar ultrapassar a tolerância = **regressão visual**. Exige justificativa documentada.

---

# Parte B — Especificação de Implementação

---

## 1. Variáveis CSS

```css
--login-offwhite:     #F8FAF8;   /* fundo superior */
--login-green:        #00A859;   /* card, accent, dot 3 */
--login-green-dark:   #0F4C2A;   /* texto escuro, intersecção logo, dot 2 */
--login-green-lime:   #70C832;   /* dots 1/4, detalhes Google icon */
--login-white:        #FFFFFF;   /* botões */
--login-content-w:    min(85%, 380px);  /* largura máxima dos botões */
--safe-top:           env(safe-area-inset-top, 0px);
--safe-bottom:        env(safe-area-inset-bottom, 0px);
```

---

## 2. Matriz Oficial de Componentes

| Componente | Largura | Altura | Escala | Pode reduzir? | Pode crescer? | Teto | Piso |
|---|---|---|---|---|---|---|---|
| `.login-wrapper` | 100vw | 100dvh | — | Não | Não | — | — |
| `.login-top` | 100% | flex: 1 | dvh | Sim | Sim | — | min-height: 0 |
| `.login-logo` | clamp(150px, 35vw, 280px) | auto (aspect 1.48) | vw | Sim (até 140px em B1) | Sim (até 280px) | 280px | 140px |
| `.login-urna` | 100% (max 600px) | max-h: min(50svh, 70vw) | min(svh, vw) | Sim (32svh em landscape/portrait curto) | Sim | 50svh ou 70vw | imagem mantém ratio |
| `.login-slogan` | 100% | auto (2 linhas) | vw | Sim (até 18px em B1) | Sim | 36px | 18px |
| `.login-card` | 100% | min-h: clamp(170px, 26dvh, 300px) | dvh | Sim (160px em portrait curto) | Sim (até 300px) | 300px | 160px |
| `.login-card__content` | var(--login-content-w) | flex: 1 | — | Sim (max-width 420–500px) | — | 500px | 420px |
| `.login-google-btn` | var(--login-content-w) | clamp(44px, 7.5dvh, 60px) | dvh | Sim (36–40px em MQs) | Sim (até 60px) | 60px | 36px |
| `.login-how-it-works` | var(--login-content-w) | clamp(44px, 7.5dvh, 60px) | dvh | Idem | Idem | 60px | 36px |
| `.login-tagline` | 100% | auto | — | — | — | — | — |

---

## 3. Especificação de Espaçamentos

### 3.1 Hierarquia vertical de espaços

```
LoginWrapper (100dvh)
│
├── LoginTop (flex: 1)
│   │
│   ├── padding-top:    clamp(4px,  1dvh,  12px)  [espaço seguro]
│   │
│   ├── LOGO
│   │   (altura determinada por width ÷ 1.48)
│   │
│   ├── GAP: space-between distribui igualmente
│   │   entre logo e urna (≈7% em 740px)
│   │
│   ├── URNA
│   │   (max-height: min(50svh, 70vw))
│   │
│   ├── GAP: space-between distribui igualmente
│   │   entre urna e slogan (≈7% em 740px)
│   │
│   ├── SLOGAN
│   │   (2 linhas, line-height 1.2, gap 2px)
│   │
│   └── padding-bottom: clamp(32px, 5dvh, 60px)
│       [espaço de transição para o card]
│
└── LoginCard (min-height: clamp(170px, 26dvh, 300px))
    │
    ├── padding-top: clamp(14px, 2.5dvh, 24px)
    │
    ├── [espaço de centralização: flexível]
    │
    ├── BOTÃO GOOGLE
    │   (height: clamp(44px, 7.5dvh, 60px))
    │
    ├── gap: clamp(10px, 1.5dvh, 16px)
    │
    ├── BOTÃO CONHEÇA O APP
    │   (height: clamp(44px, 7.5dvh, 60px))
    │
    ├── [espaço de centralização: flexível]
    │
    ├── margin-top: clamp(4px, 0.8dvh, 12px)
    │
    ├── TAGLINE
    │   (font-size: clamp(11px, 1.6vw, 13px))
    │
    └── padding-bottom: clamp(16px, 2.5dvh, 24px)
```

### 3.2 Valores na tela mestre (740px de altura)

| Espaço | Valor |
|---|---|
| Top padding-top | 4px |
| Gap logo → urna | ≈52px |
| Gap urna → slogan | ≈52px |
| Top padding-bottom | 37px |
| Card padding-top | 18.5px |
| Gap acima botões | ≈5.5px |
| Gap entre botões | 11px |
| Gap abaixo botões | ≈5.5px |
| Tagline margin-top | 5.9px |
| Card padding-bottom | 18.5px |

---

## 4. Fluxograma de Decisão

```
                     Viewport
                         │
                         ▼
                  ┌──────────────┐
                  │  Wrapper     │
                  │  100dvh      │
                  │  flex column │
                  └──────┬───────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ Largura ≥ 1024px?      │
            └──────┬────────┬────────┘
                   │ SIM    │ NÃO
                   ▼        ▼
      ┌────────────────────┐ │
      │ Desktop (B4/B5)    │ │
      │ flex-direction:row │ │
      │ lado a lado        │ │
      └────────────────────┘ │
                             ▼
              ┌──────────────────────────┐
              │ Orientation: landscape   │
              │ AND height ≤ 640px?      │
              └──────┬────────┬──────────┘
                     │ SIM    │ NÃO
                     ▼        ▼
          ┌──────────────┐   │
          │ Landscape    │   │
          │ reduzido     │   │
          │ dots ocultos │   │
          └──────────────┘   │
                             ▼
              ┌──────────────────────────────┐
              │ Orientation: portrait        │
              │ AND height ≤ 680px           │
              │ AND width ≥ 430px?           │
              └──────┬────────┬──────────────┘
                     │ SIM    │ NÃO
                     ▼        ▼
          ┌──────────────┐   │
          │ Portrait     │   │
          │ Curto        │   │
          │ reduzido     │   │
          └──────────────┘   │
                             ▼
                    ┌────────────────┐
                    │ Layout Normal  │
                    │ (base clamps)  │
                    └────────────────┘
```

---

## 5. Matriz de Breakpoints

| # | Faixa | Nome | O que muda | Justificativa |
|---|---|---|---|---|
| **Base** | Todos | Layout fluido | Nada. Tudo escala por clamp() | Cobre 360–599px e 768–833px |
| **B1** | < 360px | Muito pequeno | Logo 140px, slogan 18px, padding reduzido, radius 24px | Espaço horizontal insuficiente |
| **B2** | 600–767px | Tablet pequeno | Card max-width: 420px | Botões excessivamente largos |
| **B3** | 768–1023px (768–833: 460px, 834+: 500px) | Tablet portrait | Card padding 32/24/24, radius 40px, max-width 460→500px | Espaçamento generoso para tablets |
| **B4** | 1024–1279px | Desktop compacto | Lado a lado, card flutuante 450px, wrapper padding 40px | Layout horizontal |
| **B5** | ≥ 1280px | Desktop amplo | Lado a lado, card 460px, padding 40/32, logo 260px, slogan 36px, gradiente bg | Aproveita espaço extra |

### 5.1 Layout normal (base)
Nenhum breakpoint ativo. Todos os valores são determinados exclusivamente por `clamp()` com unidades `dvh`/`vw`. Cobre a maioria dos dispositivos móveis.

### 5.2 Desktop (B4 e B5) — layout lado a lado
```css
.login-wrapper {
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
.login-top {
  flex: 1;
  max-width: 650px;
}
.login-card {
  border-radius: 32px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
}
```
- **B4:** wrapper padding 40px, bg #EBF3ED, card `flex: 0 0 450px`
- **B5:** wrapper gap 60px padding 0/80px, bg gradient, card `flex: 0 0 460px`, padding 40/32, logo 260px, slogan 36px

---

## 6. Landscape

**Ativação:** `@media (max-height: 640px) and (orientation: landscape)`

### Alterações

| Elemento | Valor |
|---|---|
| `.login-logo` | `clamp(100px, 18vw, 150px)` |
| `.login-urna` | `max-height: 32svh` |
| `.login-slogan` | `clamp(16px, 3vw, 22px)` |
| Botões height | `clamp(40px, 6dvh, 48px)` |
| Botões font-size | `clamp(13px, 2vw, 15px)` |
| Dots 1–4 | `display: none` |
| Vídeo | `aspect-ratio: 16/9` |

---

## 7. Portrait Curto

**Ativação:** `@media (max-height: 680px) and (orientation: portrait) and (min-width: 430px)`

### Alterações

| Elemento | Valor |
|---|---|
| `.login-logo` | `clamp(140px, 30vw, 200px)` |
| `.login-urna` | `max-height: 32svh` |
| Card min-height | `clamp(160px, 24dvh, 240px)` |
| Botões height | `clamp(36px, 5dvh, 44px)` |
| Botões font-size | `clamp(11px, 2vw, 14px)` |
| Tagline font-size | `clamp(9px, 1.2vw, 11px)` |

---

## 8. Acessibilidade

### Movimento Reduzido
```css
@media (prefers-reduced-motion: reduce) {
  .login-how-it-works,
  .login-how-it-works__icon,
  .login-google-btn,
  .login-video-overlay,
  .login-video-modal {
    transition: none !important;
    animation: none !important;
  }
}
```

### Alto Contraste
```css
@media (prefers-contrast: high) {
  .login-top            { background: #fff; }
  .login-slogan__main,
  .login-slogan__accent { color: #000; }
  .login-how-it-works,
  .login-google-btn     { border: 2px solid #000; box-shadow: none; }
  .login-how-it-works:hover,
  .login-google-btn:hover { background: #000; color: #fff; }
  .login-tagline        { color: #fff; }
}
```

---

## 9. Componentes Decorativos

### Pattern
```css
.login-top__pattern {
  position: absolute; inset: 0;
  pointer-events: none;
  background-image: repeating-radial-gradient(
    circle at 50% 40%, transparent, transparent 50px,
    rgba(0, 168, 89, 0.04) 50px, rgba(0, 168, 89, 0.04) 51px
  );
}
```

### Dots

| # | Tamanho | Cor | Posição | Opacidade |
|---|---|---|---|---|
| 1 | 12px | `#70C832` | top:12%; left:18% | 0.5 |
| 2 | 8px | `#0F4C2A` | top:22%; right:20% | 0.35 |
| 3 | 10px | `#00A859` | bottom:30%; left:12% | 0.4 |
| 4 | 6px | `#70C832` | bottom:25%; right:15% | 0.6 |

---

## 10. Design Tokens

### 10.1 Tabela oficial de tokens

Todos os valores de layout são centralizados em variáveis CSS no `:root`. Qualquer alteração futura deve passar por estas variáveis, nunca por valores soltos nos seletores.

| Token | Valor no `:root` | Uso |
|---|---|---|
| **Paleta** | | |
| `--login-offwhite` | `#F8FAF8` | Fundo da área superior |
| `--login-green` | `#00A859` | Card, accent, dot 3 |
| `--login-green-dark` | `#0F4C2A` | Texto escuro, intersecção logo, dot 2 |
| `--login-green-lime` | `#70C832` | Dots 1/4, detalhes Google icon |
| `--login-white` | `#FFFFFF` | Botões |
| **Tipografia** | | |
| `--font-family` | `'Inter', -apple-system, sans-serif` | Toda a tela |
| `--slogan-size` | `clamp(20px, 4.5vw, 36px)` | Slogan |
| `--tagline-size` | `clamp(11px, 1.6vw, 13px)` | Tagline |
| `--button-font-size` | `clamp(13px, 3vw, 19px)` | Botões |
| **Botões** | | |
| `--button-height` | `clamp(44px, 7.5dvh, 60px)` | Google + Conheça o App |
| `--button-gap` | `clamp(8px, 1.5vw, 12px)` | Gap entre ícone e texto |
| `--button-radius` | `clamp(12px, 2.2vw, 18px)` | Border-radius dos botões |
| `--button-icon-size` | `clamp(18px, 3.5vw, 28px)` | Ícone Google |
| `--play-icon-size` | `clamp(22px, 3.5vw, 28px)` | Ícone Play |
| `--button-shadow` | `0 4px 20px rgba(0,0,0,0.12)` | Sombra padrão |
| `--button-shadow-hover` | `0 8px 28px rgba(0,0,0,0.18)` | Sombra hover |
| `--login-content-w` | `min(85%, 380px)` | Largura dos botões |
| **Card** | | |
| `--card-min-height` | `clamp(170px, 26dvh, 300px)` | Altura mínima |
| `--card-radius` | `32px` | Border-radius superior |
| `--card-padding-top` | `clamp(14px, 2.5dvh, 24px)` | Padding superior |
| `--card-padding-x` | `20px` | Padding lateral |
| `--card-padding-bottom` | `clamp(16px, 2.5dvh, 24px)` | Padding inferior |
| `--card-content-gap` | `clamp(10px, 1.5dvh, 16px)` | Gap entre botões |
| `--card-content-max-w` | `480px` | Largura máxima do conteúdo |
| **Layout** | | |
| `--logo-width` | `clamp(150px, 35vw, 280px)` | Logo |
| `--urna-max-height` | `min(50svh, 70vw)` | Urna (altura máxima) |
| `--urna-max-width` | `600px` | Urna (largura máxima) |
| `--tagline-margin-top` | `clamp(4px, 0.8dvh, 12px)` | Tagline (espaçamento superior) |
| `--tagline-gap` | `clamp(6px, 1vw, 10px)` | Tagline (gap entre palavras) |
| **Safe area** | | |
| `--safe-top` | `env(safe-area-inset-top, 0px)` | Notch/camera |
| `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` | Home indicator |

### 10.2 Como criar um novo token

1. Adicionar a variável no bloco `:root` do CSS
2. Nomear no padrão `--categoria-propriedade` (ex: `--card-radius`, `--button-height`)
3. Usar `var(--token)` nos seletores
4. Atualizar esta tabela

---

## 11. Matriz de Dependências

Documenta qual variável da viewport (largura, altura, breakpoint) influencia cada componente.

| Componente | Depende da largura (vw) | Depende da altura (dvh/svh) | Depende de breakpoint |
|---|---|---|---|
| `.login-wrapper` | 100vw | 100dvh | B4/B5 (flex-direction) |
| `.login-top` | — | flex: 1 | B1 (padding), B4/B5 (height/justify) |
| `.login-top__pattern` | — | — | — |
| `.login-dot--1..4` | — | — | Landscape (display:none) |
| `.login-logo` | ✔ (35vw) | — | B1 (140px), Landscape (18vw), Portrait Curto (30vw), B5 (260px) |
| `.login-urna` | ✔ (70vw) | ✔ (50svh) | Landscape (32svh), Portrait Curto (32svh) |
| `.login-slogan` | ✔ (4.5vw) | — | B1 (18px), Landscape (3vw) |
| `.login-card` | — | ✔ (26dvh) | B1 (24px radius), B3 (40px radius, padding), B4/B5 (flutuante) |
| `.login-card__content` | — | — | B2/B3 (max-width override) |
| `.login-google-btn` | ✔ (3vw font, 3.5vw icon) | ✔ (7.5dvh) | Landscape/Portrait Curto (reduzido) |
| `.login-how-it-works` | ✔ (3vw font, 3.5vw icon) | ✔ (7.5dvh) | Landscape/Portrait Curto (reduzido) |
| `.login-tagline` | ✔ (1.6vw) | ✔ (0.8dvh margin) | Portrait Curto (fs reduzido) |

### 11.1 Como usar esta matriz

- **Se a largura muda:** componentes com ✔ em "Depende da largura" serão afetados
- **Se a altura muda:** componentes com ✔ em "Depende da altura" serão afetados
- **Se um breakpoint é alterado:** verificar os componentes marcados
- **Para adicionar um componente:** preencher esta matriz antes de implementar

---

## 12. Política para Novos Breakpoints

### Regra fundamental

> **Nenhum novo breakpoint poderá ser criado sem comprovar que o layout fluido (clamp, vw, dvh, svh) não resolve o problema.**

### Processo de aprovação

Um novo breakpoint só é aceito quando:

1. ✅ O layout fluido foi testado com limites de `clamp()` ajustados
2. ✅ Existe diferença visual comprovada entre duas faixas de resolução (com screenshots)
3. ✅ O breakpoint não pode ser substituído por um ajuste nos limites mínimo/máximo do `clamp()`
4. ✅ A alteração mínima necessária foi implementada (apenas as propriedades que precisam mudar)
5. ✅ A transição entre o breakpoint anterior e o novo é suave (sem saltos visuais)
6. ✅ O número total de breakpoints não ultrapassa 7 (5 atuais + 2 MQs especiais)

### Consequências da violação

- Breakpoints sem justificativa visual comprovada serão removidos na próxima revisão
- O responsável deverá reverter e encontrar solução fluida

---

## 13. Processo de Validação

### 13.1 Fluxo de validação visual

```
1. Abrir navegador no modo responsivo (DevTools)
2. Selecionar resolução obrigatória (T1–T11)
3. Comparar visualmente com screenshot da tela mestre (T2)
4. Verificar checklist de qualidade
5. Se aplicável: medir valores com getComputedStyle()
6. Capturar screenshot para registro
7. Avançar para próxima resolução
8. Ao final: aprovar somente se dentro das tolerâncias
```

### 13.2 Critérios de aprovação por resolução

| Item | Método | Critério |
|---|---|---|
| Proporção do logo | Inspeção visual + measure | Dentro de ±5% (142–158px em 360px) |
| Altura do card | getComputedStyle | Dentro de ±3% |
| Altura dos botões | getComputedStyle | Dentro de ±2% |
| Alinhamento | Inspeção visual | Centralizado |
| Scroll | document.body.scrollHeight vs window.innerHeight | scrollHeight ≤ innerHeight |
| Sobreposição | Inspeção visual | Nenhuma |
| Salto visual | Comparação entre breakpoints adjacentes | Transição suave |

### 13.3 Ferramentas sugeridas

- **Desenvolvimento:** Chrome DevTools (modo responsivo)
- **Regressão automatizada:** Playwright/Puppeteer com screenshot comparison
- **Medição:** `window.getComputedStyle(elemento).propriedade`
- **Comparação:** PixelMatch ou resemble.js para diff de screenshots

---

## 14. Definition of Done (DoD)

Toda alteração na tela de login só pode ser considerada **concluída** quando:

- [ ] Nenhuma regressão visual foi introduzida (critérios R1–R10 respeitados)
- [ ] Todas as 11 resoluções obrigatórias (T1–T11) foram testadas e aprovadas
- [ ] Desktop (B4 e B5) foi revisado
- [ ] Landscape e portrait curto foram testados
- [ ] Design tokens foram usados (nenhum valor solto nos seletores)
- [ ] Nenhum breakpoint novo foi criado sem justificativa documentada
- [ ] O checklist de qualidade foi executado e aprovado
- [ ] A tela continua fiel à identidade da tela mestre (360×740)
- [ ] `npm run build` passa sem erros
- [ ] A documentação foi atualizada, se necessário

---

---

## 1. Casos de Teste

### Resoluções obrigatórias

| ID | Resolução | Dispositivo | Regra |
|---|---|---|---|
| T1 | 320×568 | iPhone SE 1ª g | B1 |
| T2 | **360×740** | **Tela Mestre** | **Base** |
| T3 | 390×844 | iPhone 14 | Base |
| T4 | 412×915 | Galaxy S20+ | Base |
| T5 | 430×932 | iPhone 14 Pro Max | Base |
| T6 | 768×1024 | iPad mini | B3 (460px) |
| T7 | 834×1194 | iPad Pro 11" | B3 (500px) |
| T8 | 1024×768 | Desktop | B4 |
| T9 | 1280×800 | Desktop widescreen | B5 |
| T10 | 640×360 | Landscape | Landscape |
| T11 | 430×663 | Portrait curto | Portrait Curto |

### Procedimento
1. Abrir a tela na resolução especificada
2. Verificar visualmente contra a tela mestre (T2)
3. Aplicar checklist de qualidade
4. Registrar resultado

---

## 2. Matriz de Testes Automatizáveis

| Item | Seletor | Propriedade | Esperado (740px) | Tolerância |
|---|---|---|---|---|
| Logo largura | `.login-logo` | width | 150px | ±5% |
| Slogan font-size | `.login-slogan` | font-size | 20px | ±3% |
| Card min-height | `.login-card` | min-height | 192px | ±3% |
| Botão altura | `.login-google-btn` | height | 55px | ±2% |
| Botão altura | `.login-how-it-works` | height | 55px | ±2% |
| Botão largura | `.login-google-btn` | width | min(85%, 380px) | ±2% |
| Card top padding | `.login-card` | padding-top | 18.5px | ±5% |
| Card bottom padding | `.login-card` | padding-bottom | 18.5px | ±5% |
| Card border-radius | `.login-card` | border-radius | 32px (top) | ±0 |
| Tagline font-size | `.login-tagline` | font-size | 11px | ±5% |

> Testes podem ser executados via `getComputedStyle()` em um headless browser.

---

## 3. Critérios de Regressão

Uma alteração é considerada **REGRESSÃO VISUAL** quando:

| # | Condição | Gravidade |
|---|---|---|
| R1 | Scroll vertical apareceu | Bloqueante |
| R2 | Botão Google ≠ botão Conheça o App | Bloqueante |
| R3 | Slogan quebrou em 3+ linhas | Bloqueante |
| R4 | Elemento cortado/oculto | Bloqueante |
| R5 | Urna com aspect ratio distorcido | Bloqueante |
| R6 | Logo saiu do centro horizontal | Alta |
| R7 | Proporção fora da tolerância (Seção 8) | Alta |
| R8 | Card com altura fora de ±3% | Média |
| R9 | Tagline ilegível ou sobreposta | Média |
| R10 | Salto visual entre breakpoints adjacentes | Média |

### Aprovação
- **Zero** regressões bloqueantes
- **Zero** regressões altas
- **Máximo 1** regressão média (justificada)

---

## 4. Checklist de Qualidade

- [ ] Nenhum elemento comprimido
- [ ] Nenhum elemento desalinhado
- [ ] Logo centralizada
- [ ] Urna centralizada
- [ ] Espaçamento uniforme
- [ ] Botões alinhados e idênticos
- [ ] Card proporcional (tolerância)
- [ ] Sem scroll
- [ ] Sem sobreposição
- [ ] Sem saltos visuais entre breakpoints
- [ ] Tagline visível e legível
- [ ] Padrão de fundo visível
- [ ] Dots visíveis (mobile)
- [ ] Modal funcional
- [ ] High contrast funcional
- [ ] Reduced motion funcional

---

# Parte D — Manutenção

---

## 1. Guia de Manutenção

### Regras de ouro

1. **Tela mestre primeiro.** Sempre verificar na tela mestre antes de qualquer ajuste.
2. **Proporções antes de pixels.** Definir a proporção, depois calcular o valor.
3. **Clamp antes de breakpoint.** Sempre tentar resolver com clamp() antes de criar exceção.
4. **Um valor, uma verdade.** Cada componente tem exatamente um valor oficial.
5. **Checklist antes do merge.** Toda alteração deve passar pelo checklist.

### Como adicionar um novo elemento

1. Posicionar na árvore da interface
2. Definir proporção (% da tela)
3. Converter para pixel na tela mestre
4. Implementar com clamp() + unidade relativa
5. Verificar nas 11 resoluções obrigatórias
6. Atualizar este documento

---

## 2. Guia de Evolução

### Como adicionar um novo botão?

1. Colocar dentro de `.login-card__content` (após botões existentes)
2. Usar `width: var(--login-content-w)` e `height: clamp(44px, 7.5dvh, 60px)`
3. Usar mesma font-size, border-radius, cor e sombra dos botões existentes
4. Atualizar gap do container se necessário

### Como adicionar um novo texto?

1. Usar `clamp(font-size)` com escala por `vw`
2. Peso 500–700, família Inter
3. Posicionar na ordem correta da hierarquia visual

### Como adicionar um novo elemento visual?

1. Colocar na camada adequada (pattern/dots atrás, conteúdo à frente)
2. Não competir visualmente com os elementos principais
3. Não alterar a proporção dos elementos existentes

### Quando um novo breakpoint é permitido?

Apenas quando:
- O layout fluido (clamp) não consegue resolver
- E existe diferença visual comprovada entre duas faixas de resolução
- E a alteração não pode ser coberta por ajuste nos limites do clamp

### Como criar um novo breakpoint?

1. Identificar a faixa exata de resoluções afetadas
2. Documentar por que clamp() não resolve
3. Implementar apenas as propriedades que precisam mudar
4. Verificar transição suave nos breakpoints adjacentes
5. Testar nas resoluções obrigatórias
6. Atualizar este documento

### Como reduzir breakpoints existentes?

1. Verificar se clamp() com limites ajustados cobre a faixa
2. Testar visualmente as resoluções antes cobertas pelo breakpoint
3. Se equivalente, remover e atualizar limites do clamp
4. Remover o breakpoint e atualizar documentação

---

## 3. Histórico de Revisões

| Data | Versão | Autor | Alterações |
|---|---|---|---|
| 2026-07-30 | 1.0 | — | Documento inicial |
| 2026-07-30 | 2.0 | — | Proporções corrigidas, sistema de escala formalizado, seções de restrições/evolução/fluxograma/critérios de regressão adicionadas. Breakpoints reduzidos de 12 para 5+2 MQs. Matriz de componentes e testes automatizáveis. Números conflitantes eliminados. |

---

> **Fim do documento** — `docs/login-design-spec.md`
