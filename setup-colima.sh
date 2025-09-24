#!/bin/bash

# Ruta absoluta donde se montará el volumen mongo
MONGO_DATA_DIR="$HOME/mongo-data"

echo "🛠️  Preparando carpeta para datos de MongoDB en: $MONGO_DATA_DIR"

# Crear la carpeta si no existe
if [ ! -d "$MONGO_DATA_DIR" ]; then
  mkdir -p "$MONGO_DATA_DIR"
  echo "📁 Carpeta creada."
else
  echo "📁 Carpeta ya existe."
fi

# Dar permisos a la carpeta para el usuario actual
sudo chown -R $(whoami) "$MONGO_DATA_DIR"
chmod -R u+rwx "$MONGO_DATA_DIR"
echo "🔐 Permisos ajustados."

# Reiniciar colima para refrescar montajes
echo "🔄 Reiniciando Colima..."
colima stop
colima start

# Levantar contenedor con docker-compose
echo "🚀 Levantando contenedor MongoDB..."
docker-compose up -d

# Mostrar estado del contenedor mongo
echo "📦 Estado del contenedor mongo:"
docker ps --filter "name=mongo-db"

echo "✅ Listo, compa. Prueba conectar a mongodb://mongo-user:123456@127.0.0.1:27017/?authSource=admin"
