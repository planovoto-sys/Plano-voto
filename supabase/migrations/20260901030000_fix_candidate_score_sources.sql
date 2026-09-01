-- Distingue a nota propria do politico da nota herdada do partido.
update public.candidates as candidate
set scores = coalesce(candidate.scores, '{}'::jsonb) || jsonb_build_object(
      'candidate', null,
      'displayed', party.score,
      'status', 'nota_partido',
      'source', 'party'
    ),
    updated_at = timezone('utc', now())
from public.parties as party
where candidate.election_id = 'congresso-2026'
  and candidate.office = 'Presidente'
  and party.id = candidate.party_id;

-- Flavio Bolsonaro possui avaliacao propria no conjunto de notas compartilhado.
update public.candidates
set scores = coalesce(scores, '{}'::jsonb) || jsonb_build_object(
      'candidate', 8.21,
      'displayed', 8.21,
      'status', 'avaliado',
      'source', 'candidate'
    ),
    updated_at = timezone('utc', now())
where id = 'congresso-2026-presidente-22-flavio-bolsonaro';

-- Politicos avaliados em um cargo anterior preservam a nota propria quando
-- disputam outro cargo em 2026. A identidade foi validada por nome civil, UF e partido.
with score_updates (id, candidate_score) as (
  values
    ('congresso-2026-rj-senador-555-9a5156944e03', 8.73::numeric),
    ('congresso-2026-pe-senador-222-335d4eec2284', 8.67::numeric),
    ('congresso-2026-rs-senador-300-7f1284ec49ab', 8.58::numeric),
    ('congresso-2026-es-senador-100-ee88ad27ba98', 8.51::numeric),
    ('congresso-2026-df-senador-223-321ba8630e66', 8.42::numeric),
    ('congresso-2026-go-senador-222-510af10bb94f', 8.42::numeric),
    ('congresso-2026-se-senador-222-d60ceb0229b7', 8.33::numeric),
    ('congresso-2026-mg-senador-222-a3723ac2b5ad', 8.28::numeric),
    ('congresso-2026-rs-senador-222-58aaa83a732d', 8.25::numeric),
    ('congresso-2026-am-senador-222-cc4a6b96050b', 7.88::numeric),
    ('congresso-2026-go-senador-155-dc6cb9d16cd9', 7.40::numeric),
    ('congresso-2026-ro-senador-221-20cbc29bc5fc', 7.36::numeric),
    ('congresso-2026-rr-senador-227-e6a45b37e8d0', 7.29::numeric),
    ('congresso-2026-to-senador-100-d2a145759592', 7.23::numeric),
    ('congresso-2026-ro-senador-111-a428ae0ba471', 7.22::numeric),
    ('congresso-2026-pr-senador-222-f70fb977c2f9', 6.61::numeric),
    ('congresso-2026-mt-senador-222-63a08cc32c84', 6.58::numeric),
    ('congresso-2026-ac-senador-777-f3c9df1f7936', 6.44::numeric),
    ('congresso-2026-to-senador-153-201e9472368c', 6.40::numeric),
    ('congresso-2026-pa-senador-222-c1f667e2f7ad', 6.34::numeric),
    ('congresso-2026-pi-senador-555-636b021d0460', 5.65::numeric),
    ('congresso-2026-ap-senador-151-efea55c3d3f0', 5.24::numeric),
    ('congresso-2026-pe-senador-111-37de09e05e8e', 4.15::numeric),
    ('congresso-2026-rj-senador-131-22e3d85fe308', 3.97::numeric),
    ('congresso-2026-rj-senador-100-39490394fef5', 3.90::numeric),
    ('congresso-2026-pe-senador-555-a02d77627ebf', 3.71::numeric),
    ('congresso-2026-df-senador-131-9f59aadc79a6', 3.65::numeric),
    ('congresso-2026-ms-senador-133-5be6e5149dcd', 2.47::numeric)
)
update public.candidates as candidate
set scores = coalesce(candidate.scores, '{}'::jsonb) || jsonb_build_object(
      'candidate', score_updates.candidate_score,
      'displayed', score_updates.candidate_score,
      'status', 'avaliado',
      'source', 'candidate'
    ),
    legacy_data = coalesce(candidate.legacy_data, '{}'::jsonb) || jsonb_build_object(
      'nota', score_updates.candidate_score,
      'nota_exibida', replace(to_char(score_updates.candidate_score, 'FM999990.00'), '.', ','),
      'status_avaliacao', 'avaliado'
    ),
    updated_at = timezone('utc', now())
from score_updates
where candidate.id = score_updates.id;
