import 'dotenv/config'
import env from 'env-var'


console.log('🧪 Variables desde Railway:')
console.log('MONGO_URL:', JSON.stringify(process.env.MONGO_URL))
console.log('OPENAI_API_KEY:', JSON.stringify(process.env.OPENAI_API_KEY))
console.log('PINECONE_API_KEY:', JSON.stringify(process.env.PINECONE_API_KEY))


function validateEnvVar(name: string, defaultValue?: string) {
  const val = env.get(name).default(defaultValue ?? '').asString()
  if (!val) console.warn(`⚠️ La variable ${name} está vacía o no fue definida`)
  return val
}

export const envs = {
  PORT: env.get('PORT').default('3000').asPortNumber(),
  MONGO_URL: validateEnvVar('MONGO_URL'),
  MONGO_DB_NAME: env.get('MONGO_DB_NAME').default('leximind').asString(),
  HOST: env.get('HOST').default('localhost').asString(),

  // OpenAI Configuration
  OPENAI_API_KEY: validateEnvVar('OPENAI_API_KEY'),
  OPENAI_MODEL: env.get('OPENAI_MODEL').default('gpt-3.5-turbo').asString(),
  OPENAI_EMBEDDING_MODEL: env.get('OPENAI_EMBEDDING_MODEL').default('text-embedding-3-small').asString(),

  // Pinecone
  PINECONE_API_KEY: validateEnvVar('PINECONE_API_KEY'),
  PINECONE_INDEX_NAME: env.get('PINECONE_INDEX_NAME').default('leximind').asString(),
  PINECONE_NAMESPACE: env.get('PINECONE_NAMESPACE').default('mimir').asString(),
  PINECONE_ENVIRONMENT: env.get('PINECONE_ENVIRONMENT').default('us-east-1').asString(),

  // Supabase
  SUPABASE_URL: validateEnvVar('SUPABASE_URL'),
  SUPABASE_KEY: validateEnvVar('SUPABASE_KEY')
}
