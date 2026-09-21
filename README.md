# 모바일 청첩장

첨부된 PDF 디자인을 기준으로 만든 정적 모바일 청첩장입니다.

## 로컬 실행

저장소 루트에서 다음 명령을 실행합니다.

```bash
python3 -m http.server 4173
```

브라우저에서 `http://127.0.0.1:4173`을 엽니다.

자동 테스트는 다음 명령으로 실행합니다.

```bash
npm test
```

## 사진 파일

- 대표 사진: `images/cover.webp`
- 갤러리 사진: `images/gallery/`에 원본 파일명으로 보관하며, `src/invitation.js`의 `GALLERY_PHOTOS` 목록 순서로 표시합니다.
- 현재 사진은 총 17장으로, 한 페이지에 최대 6장씩 3페이지(6장·6장·5장)로 표시합니다.
- 사진을 추가하거나 순서를 바꿀 때는 `GALLERY_PHOTOS` 목록도 함께 수정합니다.
- 갤러리 썸네일 파일이 없으면 깨진 이미지 대신 자리표시자가 표시됩니다.
- 전체 화면 뷰어는 다음 사진의 로딩과 디코딩이 완료될 때까지 현재 사진을 유지한 뒤, 겹치지 않는 두 화면을 220ms 동안 좌우로 이동합니다. 동작 줄이기 설정에서는 애니메이션을 생략합니다.
- 뷰어 전체에서 웹 페이지 확대 제스처를 막고, 여러 손가락을 모두 뗄 때까지 사진 이동을 무시합니다. OS 접근성 확대까지 차단하는 기능은 아닙니다.

### 갤러리 최적화

원본 JPG는 `images/gallery/`에 로컬로 보존하고 Git에서 제외합니다. 배포에는 `images/gallery/optimized/`의 WebP만 포함합니다.

- `thumbnails/`: 긴 변 최대 480px, 품질 78. 갤러리 근처로 스크롤하면 불러옵니다.
- `full/`: 긴 변 최대 1,800px, 품질 85. 사진 확대 시에만 불러옵니다.
- 원본의 종횡비를 유지하고 EXIF 회전 정보를 반영합니다. 출력 파일에서는 촬영 메타데이터를 제거합니다.

원본 사진이나 목록을 변경한 뒤에는 다음 명령으로 표시용 이미지를 다시 생성합니다.

```bash
npm install
npm run optimize:gallery
```

변환 도구는 개발 시에만 사용합니다. 청첩장은 생성된 WebP를 포함하는 정적 사이트로 실행됩니다.

## 지도 버튼

Location 영역에는 카카오맵, 네이버지도, TMAP 버튼이 표시됩니다. 모든 버튼은
`보타닉 웨딩파크`를 검색하며 별도의 API 키가 필요하지 않습니다.
모바일에서는 각 앱의 검색 화면을 먼저 실행합니다. Android에서는 Intent의 대체 URL로 카카오/네이버 웹 검색 또는 TMAP Google Play 설치 화면을 지정합니다. TMAP은 통신사별 앱도 처리하도록 특정 패키지로 한정하지 않습니다.
iOS는 앱 URL Scheme을 사용하며, 앱이 열리지 않을 경우 사용자가 누를 수 있는 카카오/네이버 웹 검색 또는 TMAP App Store 설치 버튼을 함께 표시합니다. 인앱 브라우저에서 자동 대체가 지원되지 않는 경우에도 이 버튼을 이용할 수 있습니다.
앱 설치 여부나 인앱 브라우저의 실행 차단을 100% 판별할 수는 없습니다. 시간만 보고 강제 이동하는 타이머는 사용하지 않으며, 페이지가 숨겨지거나 떠날 때 대체 안내를 닫습니다. 따라서 앱에서 돌아온 뒤 뒤늦은 웹/스토어 이동을 예약하지 않습니다.
데스크톱에서는 카카오/네이버 웹 검색과 TMAP 공식 연결 페이지를 새 탭으로 엽니다. TMAP 공식 연결 페이지는 데스크톱에서 TMAP 웹사이트로 이동합니다.
실제 지도 SDK 연동은 현재 범위에 포함하지 않습니다.

버튼 아이콘은 [공식 앱스토어 이미지를 참고한 단색 SVG](images/map-icons/SOURCES.md)를 로컬에 포함해 외부 이미지 서버를 호출하지 않습니다. 흰색 배경과 검정색 심볼만 사용합니다.

연결 형식 확인 출처: [카카오맵 URL Scheme](https://apis.map.kakao.com/ios_v2/docs/getting-started/urlscheme/), [네이버 지도 URL Scheme](https://guide.ncloud-docs.com/docs/maps-url-scheme), [TMAP 공식 검색 연결 페이지](https://www.tmap.co.kr/tmap2/mobile/search.jsp), [Chrome Android Intent](https://developer.chrome.com/docs/android/intents). TMAP의 공식 페이지 소스에서 iOS와 Android의 검색 파라미터 및 설치 경로를 확인했습니다.
