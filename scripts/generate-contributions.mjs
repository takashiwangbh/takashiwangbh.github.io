import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(projectRoot, 'image/github-contributions.svg');
const expectedLogin = 'takashiwangbh';
const publicPreview = process.argv.includes('--public-preview');

const contributionLevels = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4
};

const colors = ['#1b2220', '#244b38', '#2f6b4b', '#419060', '#63b978'];

function toUtcDate(value) {
  return new Date(value + 'T00:00:00Z');
}

function normalizeDays(days) {
  const uniqueDays = new Map();

  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
      continue;
    }

    const level = Math.max(0, Math.min(4, Number(day.level) || 0));
    uniqueDays.set(day.date, { date: day.date, level });
  }

  return [...uniqueDays.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function loadAuthenticatedContributions() {
  const token = process.env.GH_CONTRIBUTIONS_TOKEN;

  if (!token) {
    throw new Error('GH_CONTRIBUTIONS_TOKEN is required for the private contribution sync.');
  }

  const query = [
    'query ContributionCalendar {',
    '  viewer {',
    '    login',
    '    contributionsCollection {',
    '      contributionCalendar {',
    '        weeks {',
    '          contributionDays {',
    '            date',
    '            contributionLevel',
    '          }',
    '        }',
    '      }',
    '    }',
    '  }',
    '}'
  ].join('\n');

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'User-Agent': 'takashiwangbh-contribution-graph'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error('GitHub GraphQL request failed with status ' + response.status + '.');
  }

  const payload = await response.json();

  if (payload.errors?.length || !payload.data?.viewer) {
    throw new Error('GitHub GraphQL did not return a contribution calendar.');
  }

  if (payload.data.viewer.login.toLowerCase() !== expectedLogin.toLowerCase()) {
    throw new Error('The contribution token belongs to a different GitHub account.');
  }

  const weeks = payload.data.viewer.contributionsCollection.contributionCalendar.weeks;

  return weeks.flatMap(week =>
    week.contributionDays.map(day => ({
      date: day.date,
      level: contributionLevels[day.contributionLevel] ?? 0
    }))
  );
}

async function loadPublicPreview() {
  const response = await fetch(
    'https://github.com/users/' + expectedLogin + '/contributions',
    { headers: { 'User-Agent': 'takashiwangbh-contribution-preview' } }
  );

  if (!response.ok) {
    throw new Error('GitHub public contribution page returned status ' + response.status + '.');
  }

  const html = await response.text();
  const cells = html.match(/<td\b[^>]*ContributionCalendar-day[^>]*>/g) || [];

  return cells.map(cell => {
    const date = cell.match(/\bdata-date="([^"]+)"/)?.[1];
    const level = cell.match(/\bdata-level="([0-4])"/)?.[1];
    return { date: date || '', level: Number(level) || 0 };
  });
}

function renderSvg(rawDays) {
  const days = normalizeDays(rawDays);

  if (!days.length) {
    throw new Error('No contribution days were returned.');
  }

  const cellSize = 7;
  const gap = 2;
  const step = cellSize + gap;
  const left = 28;
  const top = 18;

  const graphStart = toUtcDate(days[0].date);
  graphStart.setUTCDate(graphStart.getUTCDate() - graphStart.getUTCDay());

  const positionedDays = days.map(day => {
    const date = toUtcDate(day.date);
    const week = Math.floor((date.getTime() - graphStart.getTime()) / 604800000);

    return {
      ...day,
      dateObject: date,
      week,
      weekday: date.getUTCDay()
    };
  });

  const weekCount = Math.max(...positionedDays.map(day => day.week)) + 1;
  const width = left + weekCount * step + 10;
  const height = top + 7 * step + 25;

  const monthLabels = [];
  let previousMonth = '';

  for (const day of positionedDays) {
    if (day.dateObject.getUTCDate() > 7) {
      continue;
    }

    const monthKey = day.date.slice(0, 7);
    if (monthKey === previousMonth) {
      continue;
    }

    previousMonth = monthKey;
    monthLabels.push({
      name: new Intl.DateTimeFormat('en', {
        month: 'short',
        timeZone: 'UTC'
      }).format(day.dateObject),
      x: left + day.week * step
    });
  }

  const rectangles = positionedDays.map(day => {
    const x = left + day.week * step;
    const y = top + day.weekday * step;
    return (
      '<rect class="day" x="' + x + '" y="' + y + '" width="' + cellSize +
      '" height="' + cellSize + '" rx="1.5" fill="' + colors[day.level] + '"/>'
    );
  });

  const months = monthLabels.map(month =>
    '<text x="' + month.x + '" y="9">' + month.name + '</text>'
  );

  const dayLabels = [
    { label: 'Mon', row: 1 },
    { label: 'Wed', row: 3 },
    { label: 'Fri', row: 5 }
  ].map(day =>
    '<text x="0" y="' + (top + day.row * step + 6) + '">' + day.label + '</text>'
  );

  const legendY = top + 7 * step + 9;
  const legendStart = width - 76;
  const legendSquares = colors.map((color, index) =>
    '<rect x="' + (legendStart + 25 + index * step) + '" y="' + (legendY - 6) +
    '" width="' + cellSize + '" height="' + cellSize + '" rx="1.5" fill="' + color + '"/>'
  );

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="graph-title graph-description">',
    '  <title id="graph-title">GitHub contribution activity</title>',
    '  <desc id="graph-description">One year of relative contribution activity. Repository names, commits, and code are not included.</desc>',
    '  <style>text{fill:#777f7c;font:7px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;letter-spacing:.02em}.day{shape-rendering:geometricPrecision}</style>',
    '  ' + months.join('\n  '),
    '  ' + dayLabels.join('\n  '),
    '  ' + rectangles.join('\n  '),
    '  <text x="' + legendStart + '" y="' + legendY + '">LESS</text>',
    '  ' + legendSquares.join('\n  '),
    '  <text x="' + (legendStart + 25 + colors.length * step + 3) + '" y="' + legendY + '">MORE</text>',
    '</svg>',
    ''
  ].join('\n');
}

const days = publicPreview
  ? await loadPublicPreview()
  : await loadAuthenticatedContributions();

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, renderSvg(days), 'utf8');

console.log(
  'Generated contribution graph from ' +
  (publicPreview ? 'the public preview' : 'authenticated private and public activity') +
  '.'
);
