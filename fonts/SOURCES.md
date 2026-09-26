# 지도 버튼 글꼴

- 원본: [이롭게 바탕체 공식 저장소](https://github.com/iropke/font-iropke-batang/tree/24e6a14cd95c903b6584bc947406773c2e0f164f)
- 입력: `IropkeBatangM.woff` (공식 원본, 수정 전 984,484 bytes)
- 라이선스: SIL Open Font License 1.1. 저작권·라이선스 고지는 `LICENSE`에 포함한다.
- 용도: 일반 모드 지도 버튼의 `카카오맵`, `네이버지도`, `TMAP` 글자만 표시한다. 다른 영역과 개발자 모드의 글꼴은 변경하지 않는다.
- `map-labels.woff2`는 필요한 글자만 남긴 웹폰트다. 원본 획과 힌팅은 보존하며, 수정본에 원본의 Reserved Font Name을 사용하지 않도록 내부 이름을 제거했다. CSS에서는 `Invitation Map Labels`라는 별칭으로 사용한다.

FontTools와 Brotli가 설치된 별도 도구 환경에서 재생성한다. 프로젝트 실행 시 Python이나 FontTools는 필요하지 않다.

```sh
pyftsubset IropkeBatangM.woff --text='카카오맵 네이버지도 TMAP' --flavor=woff2 --obfuscate-names --name-IDs=0,1,2,3,4,5,6,7,8,9,13,14 --output-file=map-labels.woff2
```

버튼 문구에 새로운 글자를 추가할 때에는 해당 글자를 포함해 다시 생성한다.
