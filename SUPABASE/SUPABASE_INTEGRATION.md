# Guia de Integração com Supabase - Portal Método VAP

## 1. Configuração Inicial

### Passo 1: Criar projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta ou faça login
3. Clique em "New Project"
4. Escolha sua organização
5. Defina nome do projeto: "metodo-vap-portal"
6. Defina senha do banco de dados (anote essa senha!)
7. Escolha região (preferencialmente São Paulo)
8. Clique em "Create new project"

### Passo 2: Obter credenciais
Após criar o projeto, vá em Settings > API e copie:
- `Project URL`
- `anon/public key`

### Passo 3: Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_project_url_aqui
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## 2. Estrutura do Banco de Dados

### Tabelas necessárias:

#### users (usuários)
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  total_time_studied INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política: usuários só podem ver/editar seus próprios dados
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

#### user_modules (progresso dos módulos)
```sql
CREATE TABLE user_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own module progress" ON user_modules
  FOR ALL USING (auth.uid() = user_id);
```

#### study_sessions (sessões de estudo)
```sql
CREATE TABLE study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0, -- em minutos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own study sessions" ON study_sessions
  FOR ALL USING (auth.uid() = user_id);
```

#### exercise_results (resultados dos exercícios)
```sql
CREATE TABLE exercise_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE exercise_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own exercise results" ON exercise_results
  FOR ALL USING (auth.uid() = user_id);
```

#### achievements (conquistas)
```sql
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR ALL USING (auth.uid() = user_id);
```

## 3. Configuração da Autenticação

### No Supabase Dashboard:
1. Vá em Authentication > Settings
2. Configure:
   - **Site URL**: `https://seu-dominio.netlify.app` (ou localhost:5173 para dev)
   - **Redirect URLs**: adicione as URLs permitidas
3. Em Authentication > Providers:
   - Habilite "Email" 
   - Desabilite "Confirm email" se não quiser confirmação por email

## 4. Implementação no Código

### Instalar dependência:
```bash
npm install @supabase/supabase-js
```

### Configurar cliente Supabase:
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Atualizar AuthContext:
```typescript
// Substituir localStorage por Supabase Auth
const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  
  // Buscar dados do usuário na tabela users
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()
    
  setUser(userData)
}
```

## 5. Migração dos Dados

### Para migrar do localStorage para Supabase:
1. Criar função de migração que leia dados do localStorage
2. Enviar para Supabase na primeira vez que o usuário logar
3. Limpar localStorage após migração bem-sucedida

## 6. Benefícios da Integração

✅ **Dados sincronizados**: Acesso de qualquer dispositivo
✅ **Backup automático**: Dados seguros na nuvem  
✅ **Autenticação real**: Sistema robusto de login
✅ **Escalabilidade**: Suporte a milhares de usuários
✅ **Analytics**: Relatórios de uso e progresso
✅ **Segurança**: RLS (Row Level Security) nativo

## 7. Próximos Passos

1. **Criar projeto no Supabase**
2. **Executar scripts SQL** para criar tabelas
3. **Configurar variáveis de ambiente**
4. **Atualizar código** para usar Supabase
5. **Testar migração** com dados de exemplo
6. **Deploy** da versão integrada

## 8. Custos

- **Tier Gratuito**: Até 50.000 usuários ativos mensais
- **Pro**: $25/mês para projetos maiores
- **Ideal para começar**: Tier gratuito é suficiente

---

**Quer que eu implemente a integração agora?** 
Posso criar todo o código necessário para conectar com Supabase!