#!/usr/bin/env bash
# process-gifts.sh
#
# Конвертирует изображения подарков в PNG 512×512 с прозрачным фоном
# и переименовывает в gift-N.png
#
# Требования: ffmpeg
#
# Использование:
#   bash scripts/process-gifts.sh [опции]
#
# Опции:
#   --input  <dir>   Папка с исходниками (по умолчанию: public/assets/images/gifts)
#   --output <dir>   Папка для результата (по умолчанию: та же, что input)
#   --start  <n>     С какого номера начинать (по умолчанию: следующий после существующих)
#   --prefix <str>   Префикс (по умолчанию: gift)
#   --dry-run        Показать план без изменений
#
# Примеры:
#   bash scripts/process-gifts.sh
#   bash scripts/process-gifts.sh --start 1
#   bash scripts/process-gifts.sh --input ~/Downloads/batch --start 10
#   bash scripts/process-gifts.sh --dry-run

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- Параметры по умолчанию ---
INPUT_DIR="$ROOT/public/assets/images/gifts"
OUTPUT_DIR=""
PREFIX="gift"
START_NUM=""
DRY_RUN=false

# --- Парсинг аргументов ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --input)  INPUT_DIR="$2";  shift 2 ;;
    --output) OUTPUT_DIR="$2"; shift 2 ;;
    --prefix) PREFIX="$2";     shift 2 ;;
    --start)  START_NUM="$2";  shift 2 ;;
    --dry-run) DRY_RUN=true;   shift ;;
    *) echo "Неизвестный параметр: $1"; exit 1 ;;
  esac
done

[[ -z "$OUTPUT_DIR" ]] && OUTPUT_DIR="$INPUT_DIR"

# --- Проверки ---
if ! command -v ffmpeg &>/dev/null; then
  echo "Ошибка: ffmpeg не найден. Установи ffmpeg и попробуй снова."
  exit 1
fi

if [[ ! -d "$INPUT_DIR" ]]; then
  echo "Ошибка: папка не найдена: $INPUT_DIR"
  exit 1
fi

# --- Собираем входные файлы (поддерживаемые форматы) ---
mapfile -t FILES < <(
  find "$INPUT_DIR" -maxdepth 1 -type f \
    \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \
       -o -iname "*.webp" -o -iname "*.avif" -o -iname "*.tiff" \
       -o -iname "*.tif" -o -iname "*.bmp" \) \
    | sort
)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "Нет файлов для обработки в $INPUT_DIR"
  exit 0
fi

# --- Определяем начальный номер ---
if [[ -z "$START_NUM" ]]; then
  # Находим максимальный существующий номер gift-N.png в output
  MAX=0
  if [[ -d "$OUTPUT_DIR" ]]; then
    while IFS= read -r f; do
      n="${f##*${PREFIX}-}"
      n="${n%.png}"
      [[ "$n" =~ ^[0-9]+$ ]] && (( n > MAX )) && MAX=$n
    done < <(find "$OUTPUT_DIR" -maxdepth 1 -name "${PREFIX}-*.png" 2>/dev/null)
  fi
  START_NUM=$(( MAX + 1 ))
fi

# --- Вывод плана ---
echo "=== process-gifts ==="
echo "Input:  $INPUT_DIR"
echo "Output: $OUTPUT_DIR"
echo "Файлов: ${#FILES[@]}, нумерация с $START_NUM"
$DRY_RUN && echo "DRY RUN — файлы не будут изменены"
echo ""

[[ ! -d "$OUTPUT_DIR" ]] && ! $DRY_RUN && mkdir -p "$OUTPUT_DIR"

OK=0
ERRORS=0

for i in "${!FILES[@]}"; do
  INPUT_PATH="${FILES[$i]}"
  INPUT_NAME="$(basename "$INPUT_PATH")"
  N=$(( START_NUM + i ))
  OUTPUT_NAME="${PREFIX}-${N}.png"
  OUTPUT_PATH="$OUTPUT_DIR/$OUTPUT_NAME"

  echo "  $INPUT_NAME  →  $OUTPUT_NAME"
  $DRY_RUN && continue

  # ffmpeg: масштабирует с сохранением пропорций (contain),
  # добавляет прозрачные поля до 512×512, сохраняет в PNG
  if ffmpeg -y -i "$INPUT_PATH" \
      -vf "scale=512:512:force_original_aspect_ratio=decrease,\
pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" \
      -pix_fmt rgba \
      "$OUTPUT_PATH" \
      -loglevel error; then

    # Удаляем исходник если работаем в одной папке и имя изменилось
    if [[ "$INPUT_DIR" == "$OUTPUT_DIR" && "$INPUT_PATH" != "$OUTPUT_PATH" ]]; then
      rm "$INPUT_PATH"
      echo "    ✓ создан, исходник удалён"
    else
      echo "    ✓ создан"
    fi
    (( OK++ )) || true
  else
    echo "    ✗ ошибка конвертации"
    (( ERRORS++ )) || true
  fi
done

echo ""
echo "Готово: $OK обработано, $ERRORS ошибок."
