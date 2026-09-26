# 지도 앱 아이콘 출처

2026-09-21에 각 개발자의 공식 App Store 등록 페이지를 브라우저에서 확인했습니다.
아이콘은 앱 식별 및 해당 서비스 연결을 위해 사용하며, 상표와 이미지 권리는 각 서비스에 있습니다.
Apple 이미지 CDN이 제공한 200×200 WebP를 참고용 원본으로 보관합니다.
기존 단색 SVG는 원본의 식별 요소(카카오맵 위치 핀, 네이버지도 N 핀, TMAP T)를 참고해 만들었습니다.
SVG는 프로젝트용으로 단순화한 표현이며 공식 배포 로고 파일은 아닙니다.
사용자 요청에 따라 배경은 `#ffffff`, 심볼은 `#000000`만 사용합니다. 그라데이션, 그림자, 흑백 필터는 사용하지 않습니다.

## 일반·개발자 모드 컬러 아이콘 (2026-09-27)

일반·개발자 모드 모두 사용자가 선택한 [Fillmood Velvet 참고 화면](https://www.fillmood.com/sample/velvet)의 동일한 PNG 원본을 로컬에 포함합니다. 원본 색상과 종횡비를 유지하며 CSS 필터나 재생성한 로고로 대체하지 않습니다. 이미지와 상표 권리는 각 서비스에 있으며 서비스 식별·지도 연결 목적으로만 사용합니다.

- `kakao-color.png`: https://cdn.fillmood.com/static/icons/kakao-map.png
- `naver-color.png`: https://cdn.fillmood.com/static/icons/naver-map.png
- `tmap-color.png`: https://cdn.fillmood.com/static/icons/tmap.png

표시 크기는 카카오맵·네이버지도 16×16px, TMAP 14×14px입니다. 아래 단색 SVG와 참고용 WebP는 기존 출처 보존용으로 유지합니다.

| 파일 | 앱 / 개발자 | 공식 페이지 |
| --- | --- | --- |
| `kakao.webp` | 카카오맵 / Kakao Corp. | https://apps.apple.com/kr/app/id304608425 |
| `naver.webp` | 네이버지도 / NAVER Corp. | https://apps.apple.com/kr/app/id311867728 |
| `tmap.webp` | TMAP / TMAP MOBILITY | https://apps.apple.com/kr/app/id431589174 |

원본 이미지:

- 카카오맵: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/be/c5/41/bec541ff-9d76-0792-672b-c6350ca9fc2b/Placeholder.mill/200x200bb-75.webp
- 네이버지도: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/5f/5b/fa/5f5bfac4-0a50-3f16-41e4-8bc31638e25e/Placeholder.mill/200x200bb-75.webp
- TMAP: https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/9f/6d/e4/9f6de4f1-76ed-b65e-4228-3377610edf14/Placeholder.mill/200x200bb-75.webp

TMAP 연결 근거: https://www.tmap.co.kr/tmap2/mobile/search.jsp?name=보타닉%20웨딩파크
공식 연결 페이지가 iOS와 Android의 검색 스킴 및 앱 다운로드 안내를 제공하며 API 키를 요구하지 않습니다.
