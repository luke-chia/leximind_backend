#!/bin/bash

# Número de commits a mostrar (por default 5 si no pasas parámetro)
NUM_COMMITS=${1:-5}

# Encabezado
echo "Mostrando los últimos $NUM_COMMITS commits con archivos modificados:"
echo "--------------------------------------------------------------"

# Obtener los hashes y mensajes
git log --oneline -n "$NUM_COMMITS" | while read -r line; do
  COMMIT_HASH=$(echo "$line" | awk '{print $1}')
  COMMIT_MSG=$(echo "$line" | cut -d' ' -f2-)

  echo ""
  echo "🔹 Commit: $COMMIT_HASH"
  echo "📄 Mensaje: $COMMIT_MSG"

  # Mostrar archivos modificados en ese commit
  echo "📂 Archivos modificados:"
  git show --stat --oneline "$COMMIT_HASH" | tail -n +2 | sed 's/^/   • /'
done
