# Bootstrap — first publish of `@particle-academy/fancy-pixel`

This package is **code-complete, build-green, and test-green** locally. The
first publish is a **human gate**: npm won't let you configure a Trusted
Publisher for a package that doesn't exist yet, so the very first release needs
a short-lived token. Every release after that ships via OIDC with zero tokens.

Follow the workspace publishing protocol
(`fancy-ui/docs/publishing.md`). The exact steps for this package:

## 1. Create the GitHub repo

```bash
gh repo create Particle-Academy/fancy-pixel --public \
  --description "Embeddable Fancy UI verification badge + liveness beacon (zero-dep, Shadow DOM)."
```

Then add this folder as the remote and push `main` (no tag yet):

```bash
git remote add origin https://github.com/Particle-Academy/fancy-pixel.git
git push -u origin main
```

## 2. First-publish token (one-time bootstrap)

1. Create a **7-day granular** npm token at
   `https://www.npmjs.com/settings/<your-user>/tokens`, scoped to
   `@particle-academy` with **read + write**.
2. Set it as a repo secret (paste at the prompt — never echoes):

   ```bash
   gh secret set NPM_TOKEN --repo Particle-Academy/fancy-pixel
   ```

3. Temporarily switch `.github/workflows/publish.yml`'s publish step to
   token auth for this one release:

   ```yaml
   - name: Publish
     env:
       NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
     run: npx -y npm@latest publish --provenance --access public
   ```

   (Or run `npm publish --provenance --access public` locally with the token.)

4. Bump to a real version, commit, tag, push the tag:

   ```bash
   npm version 0.1.0 --no-git-tag-version   # or edit package.json
   git add package.json && git commit -m "chore: release v0.1.0"
   git tag v0.1.0 && git push origin main --tags
   ```

   CI publishes the first version.

## 3. Add the npm Trusted Publisher, then revoke the token

Once `0.1.0` is live on npm:

1. Go to
   `https://www.npmjs.com/package/@particle-academy/fancy-pixel/access`
   → **Trusted Publishers** → **Add Trusted Publisher**:
   - Publisher: **GitHub Actions**
   - Organization or user: **Particle-Academy**
   - Repository: **fancy-pixel**
   - Workflow filename: **publish.yml**
   - Environment: *(empty)*
2. **Revoke the bootstrap token** at
   `https://www.npmjs.com/settings/<your-user>/tokens`.
3. **Revert `publish.yml`** to the OIDC-only step (drop the `NODE_AUTH_TOKEN`
   env line) — it already ships in that state:

   ```yaml
   - name: Publish
     run: npx -y npm@latest publish --provenance --access public
   ```

Every subsequent release is just: bump → commit → `git tag vX.Y.Z` →
`git push origin main --tags`. CI publishes via OIDC.

## Notes

- The IIFE bundle (`dist/fancy-pixel.global.min.js`) ships in the npm tarball,
  so it's auto-available on unpkg/jsdelivr after publish for `<script>` embeds.
- `version` stays `0.0.0` until the human runs step 2 — agents do not bump it.
