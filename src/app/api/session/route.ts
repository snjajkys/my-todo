// GET /api/session - 세션이 아직 살아 있는지 확인하는 용도.
//
// 실제 갱신은 프록시가 한다. 관리자 세션이면 요청이 지나가는 것만으로
// 만료가 30초 뒤로 밀린다. 여기서는 그 요청을 받아 줄 자리만 있으면 된다.
// 로그인하지 않았다면 프록시가 401 을 돌려주므로 이 코드까지 오지 않는다.
export async function GET() {
  return new Response(null, { status: 204 })
}
