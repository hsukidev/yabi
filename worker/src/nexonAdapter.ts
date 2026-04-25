/**
 * Nexon adapter — the single module that owns the upstream contract.
 * `fetchByName` constructs the verified ranking URL, calls Nexon, parses
 * the JSON, and returns the raw rank list. Callers (the Worker handler,
 * the test suite) never touch the upstream URL or response shape directly.
 *
 * The contract was empirically validated end-to-end:
 *
 *   GET https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na
 *     ?type=overall&id=weekly
 *     &reboot_index=<0|1>
 *     &page_index=1
 *     &character_name=<name>
 *
 * The response carries `ranks[]` where each entry includes `characterName`,
 * `level`, `jobName`, `characterImgURL`, and a numeric `worldID`. Because
 * the upstream does not accept a world filter param, the Worker
 * post-filters `ranks[]` by the expected numeric `worldID`.
 */

export const NEXON_RANKING_BASE_URL = 'https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na';

export interface NexonRankEntry {
  rank: number;
  characterName: string;
  characterImgURL: string;
  jobID: number;
  jobName: string;
  level: number;
  exp: number;
  gap: number;
  worldID: number;
  startRank: number;
}

interface NexonRankingResponse {
  totalCount: number;
  ranks: NexonRankEntry[];
}

/**
 * Thrown for any non-2xx upstream status, JSON parse failure, or
 * network-level failure. The Worker handler catches this and translates
 * to a 502.
 */
export class UpstreamError extends Error {
  readonly name = 'UpstreamError' as const;
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

function buildUrl(name: string, rebootIndex: number): string {
  const params = new URLSearchParams({
    type: 'overall',
    id: 'weekly',
    reboot_index: String(rebootIndex),
    page_index: '1',
    character_name: name,
  });
  return `${NEXON_RANKING_BASE_URL}?${params.toString()}`;
}

export async function fetchByName(name: string, rebootIndex: number): Promise<NexonRankEntry[]> {
  const url = buildUrl(name, rebootIndex);
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new UpstreamError(`network error: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new UpstreamError(`upstream returned ${response.status}`, response.status);
  }

  let body: NexonRankingResponse;
  try {
    body = (await response.json()) as NexonRankingResponse;
  } catch (err) {
    throw new UpstreamError(`failed to parse upstream JSON: ${(err as Error).message}`);
  }

  return body.ranks ?? [];
}
