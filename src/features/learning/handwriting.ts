export type HandwritingPoint = {
  t?: number;
  x: number;
  y: number;
};

export type HandwritingStroke = HandwritingPoint[];

type DigitRecognition = {
  confidence: number;
  digit: number;
};

type DigitTemplate = {
  aspectRatio: number;
  digit: number;
  energy: number;
  ink: number;
  raster: number[];
  strokeCount: number;
};

const GRID_WIDTH = 18;
const GRID_HEIGHT = 24;

const DIGIT_TEMPLATE_PATHS: Record<number, HandwritingStroke[]> = {
  0: [
    [
      { x: 50, y: 10 },
      { x: 28, y: 18 },
      { x: 18, y: 42 },
      { x: 20, y: 94 },
      { x: 36, y: 122 },
      { x: 66, y: 124 },
      { x: 82, y: 96 },
      { x: 82, y: 40 },
      { x: 68, y: 16 },
      { x: 50, y: 10 },
    ],
  ],
  1: [
    [
      { x: 50, y: 18 },
      { x: 50, y: 122 },
    ],
    [
      { x: 38, y: 34 },
      { x: 50, y: 18 },
      { x: 62, y: 32 },
    ],
  ],
  2: [
    [
      { x: 22, y: 34 },
      { x: 38, y: 18 },
      { x: 68, y: 18 },
      { x: 80, y: 36 },
      { x: 74, y: 56 },
      { x: 54, y: 72 },
      { x: 34, y: 88 },
      { x: 20, y: 106 },
      { x: 20, y: 118 },
      { x: 82, y: 118 },
    ],
  ],
  3: [
    [
      { x: 22, y: 22 },
      { x: 58, y: 22 },
      { x: 76, y: 38 },
      { x: 58, y: 58 },
      { x: 38, y: 60 },
      { x: 58, y: 62 },
      { x: 80, y: 82 },
      { x: 60, y: 108 },
      { x: 24, y: 108 },
    ],
  ],
  4: [
    [
      { x: 68, y: 18 },
      { x: 68, y: 118 },
    ],
    [
      { x: 22, y: 72 },
      { x: 80, y: 72 },
    ],
    [
      { x: 24, y: 72 },
      { x: 56, y: 18 },
    ],
  ],
  5: [
    [
      { x: 78, y: 20 },
      { x: 30, y: 20 },
      { x: 24, y: 60 },
      { x: 58, y: 60 },
      { x: 80, y: 80 },
      { x: 62, y: 108 },
      { x: 24, y: 108 },
    ],
  ],
  6: [
    [
      { x: 74, y: 24 },
      { x: 42, y: 24 },
      { x: 24, y: 54 },
      { x: 24, y: 92 },
      { x: 44, y: 112 },
      { x: 68, y: 108 },
      { x: 78, y: 84 },
      { x: 66, y: 64 },
      { x: 40, y: 62 },
      { x: 22, y: 74 },
    ],
  ],
  7: [
    [
      { x: 22, y: 22 },
      { x: 82, y: 22 },
      { x: 46, y: 118 },
    ],
  ],
  8: [
    [
      { x: 50, y: 16 },
      { x: 28, y: 28 },
      { x: 28, y: 52 },
      { x: 50, y: 64 },
      { x: 72, y: 52 },
      { x: 72, y: 28 },
      { x: 50, y: 16 },
    ],
    [
      { x: 50, y: 64 },
      { x: 28, y: 76 },
      { x: 28, y: 102 },
      { x: 50, y: 116 },
      { x: 72, y: 102 },
      { x: 72, y: 76 },
      { x: 50, y: 64 },
    ],
  ],
  9: [
    [
      { x: 74, y: 70 },
      { x: 56, y: 60 },
      { x: 32, y: 58 },
      { x: 20, y: 40 },
      { x: 30, y: 18 },
      { x: 56, y: 16 },
      { x: 76, y: 30 },
      { x: 78, y: 62 },
      { x: 62, y: 92 },
      { x: 40, y: 114 },
      { x: 20, y: 118 },
    ],
  ],
};

const DIGIT_TEMPLATES: DigitTemplate[] = Object.entries(DIGIT_TEMPLATE_PATHS).map(
  ([digit, strokes]) => {
    const cleanedStrokes = cleanupStrokes(strokes);
    const raster = rasterizeStrokes(cleanedStrokes);

    return {
      aspectRatio: getAspectRatio(cleanedStrokes),
      digit: Number(digit),
      energy: getRasterEnergy(raster),
      ink: getRasterInk(raster),
      raster,
      strokeCount: cleanedStrokes.length,
    };
  }
);

export function recognizeNumberFromStrokes(
  strokes: HandwritingStroke[],
  options: { expectedValue?: number } = {}
) {
  const cleanedStrokes = cleanupStrokes(strokes);

  if (cleanedStrokes.length === 0) {
    return {
      confidence: 0,
      digits: [] as DigitRecognition[],
      value: null as number | null,
    };
  }

  const groupedStrokes = groupStrokesByDigit(cleanedStrokes);
  const expectedDigits = Number.isFinite(options.expectedValue)
    ? String(options.expectedValue)
        .split("")
        .map((digit) => Number(digit))
    : null;
  const digits = groupedStrokes
    .map((group, index) =>
      recognizeDigit(
        group,
        expectedDigits?.length === groupedStrokes.length ? expectedDigits[index] : undefined
      )
    )
    .filter((digit): digit is DigitRecognition => digit !== null);

  if (digits.length === 0 || digits.length !== groupedStrokes.length) {
    return {
      confidence: 0,
      digits: [] as DigitRecognition[],
      value: null as number | null,
    };
  }

  const confidence =
    digits.reduce((sum, digit) => sum + digit.confidence, 0) / digits.length;
  const value = Number(digits.map((digit) => digit.digit).join(""));

  if (!Number.isFinite(value) || confidence < 0.22) {
    return {
      confidence,
      digits,
      value: null as number | null,
    };
  }

  return {
    confidence,
    digits,
    value,
  };
}

function cleanupStrokes(strokes: HandwritingStroke[]) {
  return strokes
    .map((stroke) => {
      const nextStroke: HandwritingStroke = [];

      for (const point of stroke) {
        const previousPoint = nextStroke.at(-1);

        if (!previousPoint || distance(previousPoint, point) >= 2.5) {
          nextStroke.push(point);
        }
      }

      return nextStroke;
    })
    .filter((stroke) => stroke.length >= 2);
}

function groupStrokesByDigit(strokes: HandwritingStroke[]) {
  const strokeBoxes = strokes
    .map((stroke) => ({
      box: getBoundingBox([stroke]),
      stroke,
    }))
    .filter(
      ({ box }) => box.height >= 10 && (box.width >= 4 || box.height >= 24)
    )
    .sort((left, right) => left.box.minX - right.box.minX);

  if (strokeBoxes.length === 0) {
    return [] as HandwritingStroke[][];
  }

  const totalBox = getBoundingBox(strokes);
  const averageStrokeWidth =
    strokeBoxes.reduce((sum, item) => sum + item.box.width, 0) / strokeBoxes.length;
  const splitGap = Math.max(10, averageStrokeWidth * 0.42, totalBox.width * 0.1);
  const groups: HandwritingStroke[][] = [];
  let currentGroup: HandwritingStroke[] = [strokeBoxes[0].stroke];
  let currentMaxX = strokeBoxes[0].box.maxX;

  for (const item of strokeBoxes.slice(1)) {
    if (item.box.minX - currentMaxX > splitGap) {
      groups.push(currentGroup);
      currentGroup = [item.stroke];
    } else {
      currentGroup.push(item.stroke);
    }

    currentMaxX = Math.max(currentMaxX, item.box.maxX);
  }

  groups.push(currentGroup);

  return groups.slice(0, 3);
}

function recognizeDigit(strokes: HandwritingStroke[], preferredDigit?: number) {
  const raster = rasterizeStrokes(strokes);
  const aspectRatio = getAspectRatio(strokes);
  const strokeCount = cleanupStrokes(strokes).length;
  const ink = getRasterInk(raster);
  const energy = getRasterEnergy(raster);
  const rankedTemplates = DIGIT_TEMPLATES.map((template) => {
    const overlap = template.raster.reduce(
      (sum, value, index) => sum + value * raster[index],
      0
    );
    const cosineSimilarity =
      overlap / Math.max(0.0001, template.energy * energy);
    const distanceScore =
      template.raster.reduce(
        (sum, value, index) => sum + Math.abs(value - raster[index]),
        0
      ) / template.raster.length;
    const aspectPenalty = Math.min(
      0.2,
      Math.abs(template.aspectRatio - aspectRatio) * 0.2
    );
    const strokePenalty = Math.min(
      0.12,
      Math.abs(template.strokeCount - strokeCount) * 0.045
    );
    const inkPenalty = Math.min(
      0.12,
      (Math.abs(template.ink - ink) / Math.max(template.ink, ink, 1)) * 0.16
    );
    const totalScore =
      cosineSimilarity - distanceScore * 0.6 - aspectPenalty - strokePenalty - inkPenalty;

    return {
      digit: template.digit,
      totalScore,
    };
  }).sort((left, right) => right.totalScore - left.totalScore);

  const best = rankedTemplates[0];
  const preferredTemplate =
    preferredDigit === undefined
      ? null
      : rankedTemplates.find((template) => template.digit === preferredDigit) ?? null;
  const chosen =
    preferredTemplate && preferredTemplate.totalScore >= best.totalScore - 0.07
      ? preferredTemplate
      : best;
  const second = rankedTemplates.find((template) => template.digit !== chosen.digit) ?? {
    digit: chosen.digit,
    totalScore: chosen.totalScore - 0.01,
  };

  const margin = Math.max(0, chosen.totalScore - second.totalScore);
  const confidence = clamp(
    chosen.totalScore * 0.82 +
      margin * 1.45 +
      (chosen.digit === preferredDigit ? 0.12 : 0.08),
    0,
    0.99
  );

  if (chosen.totalScore < -0.08 || confidence < 0.16) {
    return null;
  }

  return {
    confidence,
    digit: chosen.digit,
  };
}

function getRasterEnergy(raster: number[]) {
  return Math.sqrt(raster.reduce((sum, value) => sum + value * value, 0));
}

function getRasterInk(raster: number[]) {
  return raster.reduce((sum, value) => sum + value, 0);
}

function rasterizeStrokes(strokes: HandwritingStroke[]) {
  const grid = Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, () => 0);
  const box = getBoundingBox(strokes);
  const safeWidth = Math.max(1, box.width);
  const safeHeight = Math.max(1, box.height);
  const scale = Math.min((GRID_WIDTH - 4) / safeWidth, (GRID_HEIGHT - 4) / safeHeight);
  const offsetX = (GRID_WIDTH - safeWidth * scale) / 2 - box.minX * scale;
  const offsetY = (GRID_HEIGHT - safeHeight * scale) / 2 - box.minY * scale;

  for (const stroke of strokes) {
    for (let index = 1; index < stroke.length; index += 1) {
      const from = stroke[index - 1];
      const to = stroke[index];
      const segmentLength = Math.max(1, distance(from, to) * scale);
      const steps = Math.max(4, Math.ceil(segmentLength * 1.4));

      for (let step = 0; step <= steps; step += 1) {
        const progress = step / steps;
        const x = (from.x + (to.x - from.x) * progress) * scale + offsetX;
        const y = (from.y + (to.y - from.y) * progress) * scale + offsetY;

        paintPixel(grid, x, y, 1);
        paintPixel(grid, x + 0.45, y, 0.55);
        paintPixel(grid, x - 0.45, y, 0.55);
        paintPixel(grid, x, y + 0.45, 0.55);
        paintPixel(grid, x, y - 0.45, 0.55);
        paintPixel(grid, x + 0.8, y + 0.25, 0.2);
        paintPixel(grid, x - 0.8, y - 0.25, 0.2);
      }
    }
  }

  const maxValue = Math.max(...grid, 1);

  return grid.map((value) => value / maxValue);
}

function paintPixel(grid: number[], x: number, y: number, amount: number) {
  const ix = Math.max(0, Math.min(GRID_WIDTH - 1, Math.round(x)));
  const iy = Math.max(0, Math.min(GRID_HEIGHT - 1, Math.round(y)));
  const index = iy * GRID_WIDTH + ix;

  grid[index] = Math.min(1, grid[index] + amount);
}

function getBoundingBox(strokes: HandwritingStroke[]) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const stroke of strokes) {
    for (const point of stroke) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }

  if (!Number.isFinite(minX)) {
    return {
      height: 0,
      maxX: 0,
      maxY: 0,
      minX: 0,
      minY: 0,
      width: 0,
    };
  }

  return {
    height: maxY - minY,
    maxX,
    maxY,
    minX,
    minY,
    width: maxX - minX,
  };
}

function getAspectRatio(strokes: HandwritingStroke[]) {
  const box = getBoundingBox(strokes);

  return box.height <= 0 ? 0 : box.width / box.height;
}

function distance(left: HandwritingPoint, right: HandwritingPoint) {
  const dx = right.x - left.x;
  const dy = right.y - left.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
