<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## App architecture
- Render the shared Header, main Outlet and Footer in the root route so every page, including 404, uses the same accessible shell.
- Keep shared site copy, navigation and page metadata helpers in src/config; this prevents divergent labels across routes.
- Use a reusable Logo component with a locally replaceable placeholder; no external image is needed for the base layout.
- Use Radix Dialog primitives with design-system Buttons for the mobile navigation; modal focus trapping, Escape dismissal and focus restoration remain library-managed.
- Keep each placeholder page in its own TanStack file route with leaf head metadata; this preserves direct URLs and unique page titles.
- Self-host font assets through installed font packages and define visual styles in the global token system; no CDN requests are needed.
