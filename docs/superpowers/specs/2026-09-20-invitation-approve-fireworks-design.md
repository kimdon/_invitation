# Developer Invitation Copy and Approval Design

## Goal

Keep the normal invitation unchanged while making the developer-mode invitation copy friendly, professional, and playful. Simplify the approval interaction so it requires no typed comment and celebrates approval with fireworks.

## Invitation copy

The normal-mode greeting remains unchanged. Developer mode shows a separate greeting in the same Invitation section:

> 서로 다른 branch에서 시작된 두 사람이
>
> 수많은 commit으로 추억을 쌓아왔습니다.
>
> 가끔 예상하지 못한 conflict도 있었지만
>
> 대화와 믿음으로 하나씩 resolve해 왔습니다.
>
> 이제 두 마음을 평생이라는 main branch에 merge하려 합니다.
>
> 저희의 새로운 release를 따뜻한 마음으로 approve해 주세요.

Both greetings stay in the existing section and CSS selects the appropriate one using the invitation mode. No JavaScript text swapping is introduced.

## Display name and boot logs

- Keep the Korean name `김병관` unchanged.
- Change the groom's English display name in both normal and developer modes to `Kim Byung-kwan`.
- Extend the developer boot sequence with `DEBUG BranchHistory : commit history synchronized`.
- Extend the developer boot sequence with `WARNING ConflictResolver : minor conflicts resolved with trust`.
- Preserve the existing deployment, profile, schedule, venue, and success log entries.

## Approval interaction

- Remove the visitor comment label, input, and visitor log.
- Keep the five existing AI selectors and their distinct approval responses.
- Rename the action to `APPROVE ♥`.
- On every valid button click, reveal the selected AI response, show `200 OK — 승인되었습니다. ♥`, and launch the existing 42-particle text/icon fireworks.
- Temporarily disable the button while the animation is active, then allow another approval and another animation.
- Reduced-motion mode shows the approval response without animated particles.

## Scope and verification

Only `index.html`, `src/app.js`, `src/invitation.js`, `styles.css`, and the existing tests are changed. Existing Korean names, AI rotation, maps, gallery, accounts, and developer transition stay intact.

Automated checks verify the separate developer greeting, English display name, DEBUG and WARNING boot entries, absence of comment controls and visitor-log behavior, the new approval response, and retained fireworks wiring. A browser smoke test verifies normal/developer copy switching, approval behavior, repeated clicks, reduced horizontal overflow, and console errors.
