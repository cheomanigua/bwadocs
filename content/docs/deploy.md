---
title: "Deploy"
weight: 50
# bookFlatSection: false
# bookToc: true
# bookHidden: false
# bookCollapseSection: false
# bookComments: false
# bookSearchExclude: false
# bookHref: ''
# bookIcon: ''
---

> [!WARNING]
> WORK IN PROGRESS. This is only at the planification stage. It is not approved yet.

You can selectively deploy different parts of your Hugo-generated site to **different targets** (GCS for restricted posts, Firebase Hosting for the rest). GitHub Actions gives you the flexibility to run arbitrary scripts, so you can do exactly what you described. Let’s break it down.

---

## 1. Your Workflow Concept

1. **Author writes posts locally using Hugo**

   * Restricted content → `content/posts`
   * Unrestricted content → other pages (Home, Login, Contact, etc.)
2. **Push to GitHub**
3. **GitHub Actions workflow runs**

   * Builds Hugo site → generates `public/` folder
   * Splits the output:

     * `/posts` → **GCS Bucket**
     * Everything else → **Firebase Hosting**
   * Uploads each to the right platform
4. Users visit site:

   * Unrestricted pages served directly via Firebase Hosting
   * Restricted pages served via GCS with **signed URLs** (your Go server)

---

## 2. Feasibility

* **Firebase Hosting:** GitHub Actions has a ready-made action [`FirebaseHostingDeploy`](https://github.com/marketplace/actions/deploy-to-firebase-hosting) to deploy your site.
* **GCS Upload:** You can use [`google-github-actions/upload-cloud-storage`](https://github.com/google-github-actions/upload-cloud-storage) or simply a `gsutil cp` command in your workflow to push files to a bucket.

So yes, GitHub can **send `public/posts` to GCS** and **everything else to Firebase Hosting** — it just needs the workflow to know which paths to deploy.

---

## 3. Suggested GitHub Actions Workflow

```yaml
name: Build and Deploy Hugo Site

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      # 1. Checkout repository
      - name: Checkout repository
        uses: actions/checkout@v3

      # 2. Setup Hugo
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: '0.111.3'  # Your Hugo version

      # 3. Build Hugo site
      - name: Build Hugo
        run: hugo --minify

      # 4. Move restricted posts temporarily
      - name: Move restricted posts
        run: |
          mkdir -p ../restricted_posts_temp
          mv public/posts ../restricted_posts_temp/ || true

      # 5. Deploy unrestricted pages to Firebase Hosting
      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: "${{ secrets.GITHUB_TOKEN }}"
          firebaseServiceAccount: "${{ secrets.FIREBASE_SERVICE_ACCOUNT }}"
          projectId: your-firebase-project-id
          channelId: live

      # 5. Set up Google Cloud SDK
      - name: Setup Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          service_account_key: "${{ secrets.GCP_SA_KEY }}"
          project_id: your-gcp-project-id

      # 7. Sync restricted posts to GCS using gsutil rsync (delete removed files)
      - name: Sync restricted posts to GCS
        run: |
          gsutil -m rsync -d -r ../restricted_posts_temp/posts gs://your-gcs-bucket/posts

      # 7. Restore posts folder
      - name: Restore posts folder
        run: mv ../restricted_posts_temp/posts public/ || true
```

**Notes:**

* Before deploying to Firebase Hosting, we temporarily **move the `public/posts` folder** out so that Firebase only sees unrestricted pages.
* Then we upload `public/posts` to **GCS Bucket** using the official GitHub Action.
* `GCP_SA_KEY` is your **service account JSON** stored as a GitHub secret.

1. Added `-d` to `gsutil rsync`:

```bash
gsutil -m rsync -d -r local_dir gs://bucket/path
```

* `-d` → deletes files in GCS that **don’t exist locally**.
* `-r` → recursive copy.
* `-m` → multi-threaded for speed.

2. Workflow ensures:

* Restricted posts are **always in sync** with your local Hugo content.
* Deleted posts in your repo automatically disappear from GCS.
* Firebase Hosting deployment only sees unrestricted pages.

---

## 4. Optional Enhancements

1. **Atomic deployment:** Use temporary folders for both Firebase and GCS so deployments don’t interfere.
2. **Signed URLs:** Your Go server already generates signed URLs for restricted content.
3. **Incremental deployment:** You could deploy only changed files to GCS with `gsutil rsync`.

---

## 5. Security Considerations

* Keep your Firebase and GCS service accounts as **GitHub secrets**.
* Only allow **signed URL access** for restricted files in GCS.
* Make sure Firebase Hosting never sees your restricted content.

---

### Bottom line

GitHub Actions **can handle both deployments**:

* `public/posts` → **GCS Bucket**
* `public/*` (everything else) → **Firebase Hosting**

It just requires:

* Splitting the generated `public/` folder
* Using the right deploy actions (`Firebase Hosting`, `GCS Upload`)
* Storing credentials securely in GitHub Secrets

Perfect! Adding the `-d` flag to `gsutil rsync` will **delete any files in GCS that no longer exist locally**, keeping your bucket perfectly in sync with your Hugo-generated `public/posts` folder. Here's the updated workflow:

---

### 🔹 Optional Enhancements

* Add a **commit hash or timestamp** to the logs so you know exactly which Hugo build was deployed.
* Add caching for Hugo themes (`~/.hugo`) to speed up builds.
* Optionally, split Firebase Hosting and GCS deploys into **parallel jobs** for faster CI.
