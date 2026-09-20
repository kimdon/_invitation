# White and Black Normal Mode Design

## Goal

Refresh only the normal mobile invitation with the approved pure-white editorial direction. Preserve the developer mode's terminal styling, boot flow, AI approvals, fireworks, content, and interactions.

## Approved visual direction

- Use white as the normal-mode page and section background.
- Use near-black for primary text and actions, medium gray for secondary text, and light gray for separators.
- Remove the warm beige, gold, and brown treatment from normal mode.
- Keep the layout quiet: generous vertical space, thin rules, square geometry, and no decorative card shadows inside the invitation.
- Keep Korean body copy in Gulim. Use a restrained serif face only for the English display names and large date typography shown in the approved mockup.
- Hide the decorative falling petals in normal mode so the monochrome layout remains clean.

## Cover

- Place the existing cover photo inside a narrow white inset frame rather than edge-to-edge.
- Put the English names and date below the photo on white instead of overlaying them on the image.
- The normal-mode display name is `Byung-kwan & Do-eun`; remove `Kim` from the normal-mode hero only.
- Keep the developer-mode English name and transition branding unchanged.
- Keep the develop-mode toggle available, restyled as a small black-on-white pill in normal mode.

## Sections

- Invitation, schedule, gallery, location, accounts, and footer all use a white background in normal mode.
- Separate sections with a single light-gray horizontal rule.
- Use black section labels and short black rules. Remove the normal-mode gold accent.
- Convert the family block from a dark filled card to a simple ruled text block.
- Keep all existing wording and data unless the design explicitly changes the normal-mode English hero name.

## Schedule and calendar

- Preserve the existing November 2026 seven-column calendar structure and JavaScript-generated dates.
- Keep the same date, time, venue, and D-day behavior.
- Show November 21 inside a solid black circle with a white number.
- Use gray weekday labels and black calendar numbers on white.

## Gallery

- Preserve the existing 3-column pagination, viewer, and controls.
- Give every gallery cell a 1px black border.
- Use a small white gap between cells so each black border remains visible.
- Keep images in color; the mockup's grayscale image repetition was only a visual placeholder.
- Restyle arrows, dots, and page count in black and gray.

## Location and accounts

- Keep both external map links and all transport text unchanged.
- Use an outlined map frame and monochrome map buttons: primary black, secondary white.
- Render the accounts section on white with black outlined buttons; use one solid-black button for hierarchy.
- Restyle the normal account dialog to the same white, black, and gray palette.

## Developer mode isolation

- Existing `[data-mode="developer"]` rules remain authoritative for developer mode.
- The terminal palette, boot sequence, log timing, AI review cards, one-time final approval, and fireworks must render and behave exactly as before.
- Normal-mode changes should be made in the base rules or explicit normal-mode selectors without weakening developer-mode overrides.

## Responsive behavior

- Preserve the 430px maximum invitation width.
- Maintain usable spacing down to 320px viewport width.
- Keep all controls at least 44px high where they are primary touch targets.
- Ensure the framed cover, seven-column calendar, gallery borders, and two map buttons fit without horizontal scrolling.

## Verification

- Add a failing test first for the normal-mode monochrome palette, `Byung-kwan` hero label, black gallery borders, and black circular wedding-day marker.
- Run the full existing test suite to protect normal interactions and the developer mode.
- Test at a 390 x 844 mobile viewport in the browser.
- Verify the normal cover, invitation, calendar, gallery, location, accounts, and dialog visually.
- Enter developer mode and verify the terminal boot, final AI approval, and fireworks still work.
- Confirm there are no browser console errors.

## Out of scope

- No changes to wedding details, Korean invitation wording, map destinations, account values, gallery behavior, developer-mode copy, or animation timing.
- No new images, fonts, APIs, or dependencies.
