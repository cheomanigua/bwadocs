---
title: "Video"
weight: 55
# bookFlatSection: false
# bookToc: true
# bookHidden: false
# bookCollapseSection: false
# bookComments: false
# bookSearchExclude: false
# bookHref: ''
# bookIcon: ''
---

### Production workflow summary

- Upload the video to Vimeo.
- Copy the Direct HLS Link from the video in the Vimeo dashboard.
- Paste the link as value into the "video-id" field of the post front-matter.
- When the markdown post file is pushed to GitHub, GitHub Actions will run a script:
    1. It will separate the video id and the vimeo signature from the URL.
    2. It will create a new entry in Firestore with the video id as key, and vimeo secret as value.
    3. It will set `video-id` as GCS Metadata.
- The shortcode `gated-video.html` needs the ID to tell the API which signature to look up.
    ```html
    <source src="/api/video/manifest?video_id={{ .Page.Params.video_id }}" type="application/x-mpegURL">
    ```
- The `handleVideoManifest` method will use that `video-id`.
    ```go
    func (a *App) handleVideoManifest(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    videoID := r.URL.Query().Get("video_id") // Passed from gated-video.html

    // Fetch the secret signature that GitHub Actions just saved
    dsnap, err := a.firestore.Collection("videos").Doc(videoID).Get(ctx)
    if err != nil {
        http.Error(w, "Video not found", 404)
        return
    }
    signature := dsnap.Data()["signature"].(string)

    vimeoURL := fmt.Sprintf("https://player.vimeo.com/external/%s.m3u8?s=%s&logging=false", videoID, signature)
    
    // ... proceed with your resp, err := http.Get(vimeoURL) and filtering ...
   }
   ```
