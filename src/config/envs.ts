import 'dotenv/config'
import env from 'env-var'

export const envs = {
  PORT: env.get('PORT').required().asPortNumber(),
  MONGO_URL: env.get('MONGO_URL').default('mongodb://localhost:27017').asString(),
  MONGO_DB_NAME: env.get('MONGO_DB_NAME').default('leximind').asString(),
  HOST: env.get('HOST').default('localhost').asString(),
  
  // OpenAI Configuration
  OPENAI_API_KEY: env.get('OPENAI_API_KEY').default('sk-dummy-key-replace-with-real-key').asString(),
  OPENAI_MODEL: env.get('OPENAI_MODEL').default('gpt-3.5-turbo').asString(),
  OPENAI_EMBEDDING_MODEL: env.get('OPENAI_EMBEDDING_MODEL').default('text-embedding-3-small').asString(),
  
  // Pinecone Configuration
  PINECONE_API_KEY: env.get('PINECONE_API_KEY').default('pcsk-dummy-key-replace-with-real-key').asString(),
  PINECONE_INDEX_NAME: env.get('PINECONE_INDEX_NAME').default('leximind').asString(),
  PINECONE_NAMESPACE: env.get('PINECONE_NAMESPACE').default('mimir').asString(),
  PINECONE_ENVIRONMENT: env.get('PINECONE_ENVIRONMENT').default('us-east-1').asString(),
  
  // Supabase Configuration
  SUPABASE_URL: env.get('SUPABASE_URL').default('https://dummy.supabase.co').asString(),
  SUPABASE_KEY: env.get('SUPABASE_KEY').default('sb-dummy-key').asString(),
}
