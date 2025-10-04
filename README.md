GeoB2B SaaS

Aplicação SaaS multi-tenant para gestão de empresas e pontos geográficos, com visualização interativa em mapas. O sistema permite cadastrar organizações, registrar pontos de interesse e explorar os dados em tempo real utilizando MapLibre e MapTiler.

Funcionalidades
- Criação e gerenciamento de empresas (tenants) com slug único.
- Cadastro de pontos geográficos (places) com título, descrição, tags e coordenadas.
- Visualização em mapa com suporte a:
  - Clusters automáticos de pontos.
  - Heatmap.
  - Diferentes estilos de mapa (streets, bright, hybrid).
  - Geocodificação de endereços (MapTiler).
- Dashboard com autenticação JWT.
- Integração com Redis para cache e PostgreSQL para persistência.

Arquitetura
- Frontend: React + Vite + TailwindCSS
- Backend: Node.js (Express + Prisma)
- Banco de Dados: PostgreSQL
- Cache: Redis
- Proxy reverso: Nginx
- Infraestrutura: Docker Compose

Estrutura de Pastas
geo-b2b/
├── apps/
│   └── web/            # Frontend React/Vite
├── services/
│   └── api/            # Backend Node/Express/Prisma
├── infra/              # Nginx, docker-compose, etc.
└── .env.example        # Variáveis de ambiente

Variáveis de Ambiente
Copie .env.example para .env e configure os valores:

VITE_MAPTILER_KEY=REPLACE_ME
VITE_API_BASE=/api
DATABASE_URL=postgresql://user:password@postgres:5432/geodb
REDIS_URL=redis://redis:6379
JWT_SECRET=changeme

Como Rodar
1. Build dos serviços:
   docker compose -f infra/docker-compose.yml build

2. Subida dos containers:
   docker compose -f infra/docker-compose.yml up -d

3. Acesso:
   - Frontend: http://localhost
   - API: http://localhost/api

Credenciais de Teste
- Email: admin@example.com
- Senha: 123456

Roadmap
- Deploy em plataforma pública (Render, Railway ou VPS).
- Adição de observabilidade (Prometheus, Grafana, Loki).
- Evolução para nível 12.
