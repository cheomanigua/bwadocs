---
title: "Content Guard"
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

Users could to access posts ONLY if their plan matches the category specified in the front-matter of the markdown file.

### Workflow Diagram

```mermaid
flowchart LR
    subgraph Browser
        direction TB
        request([Request: URI])
        page_load([Load Static HTML])
    end
    subgraph Go API
        direction TB
        handler(contentGuardHandler)
        helper(getAuthenticatedUserFromCookie)
        auth_admin(Firebase<br/>Admin SDK<br/> Auth Client)
        firestore_client(Firestore<br/>Admin Client)
        guard(ContentGuard.IsAuthorized)
    end
    subgraph FIRESTORE
        direction TB
        db(users Collection)
    end
    subgraph Filesystem
        direction TB
        static_file(week0001/index.html)
    end

    request -- "1" --> handler
    handler <-- "8 / 2"--> helper
    helper <-- "4 / 3" --> auth_admin
    helper -- 5 --> firestore_client
    firestore_client -- 6 --> db
    db -- 7 --> helper
    handler <-- "10 / 9" --> guard
    handler -- "11" --> static_file
    static_file -- "12" --> page_load
```

### Process

-   **1.** Request URI: The user’s browser requests a restricted URL (e.g., `/posts/week0001`). The browser automatically attaches the stored `__session` cookie.
-   **2.** Check cookie: The handler calls `getAuthenticatedUserFromCookie(r)` to determine the user’s identity and plan.
-   **3.** Read `__session` cookie: The helper reads the `__session` cookie from the request headers.
-   **4.** Verify cookie: The helper sends the cookie value to the Admin SDK Auth Client (via `VerifySessionCookie`) to securely verify its validity and extract the user’s UID.
-   **5.** Get UID: Using the verified UID, the helper calls the Firestore Admin Client to read the user’s `plan` from the `users` collection.
-   **6.** Read plan/profile: The helper returns the full `AuthUser` struct, including the retrieved `Plan` (or `Plan="visitor"` if no cookie was found/verified).
-   **7.** Return `plan` (e.g. ‘pro’): The handler calls `contentGuard.IsAuthorized(requestPath, userPlan)`.
-   **8.** Return `AuthUser`: The Guard checks the requested path against its cached plan map (ContentGuard.permissions). If the user’s plan matches any required plan (or the content is unrestricted), access is granted.
-   **9a.** Check `IsAuthorized(path, 'pro')`: (If Authorized): The handler constructs the local file path (e.g., `public/posts/week0001/index.html`) and calls `http.ServeFile`.
-   **9b.** Check `IsAuthorized(path, 'pro')`:(If Denied): The handler sets HTTP Status 403 Forbidden and returns a custom HTML error page detailing the denial (including the user’s current plan).
-   **10.** Match found: The `ContentGuard.IsAuthorized` function returns true because the authenticated user’s Plan (e.g., ‘pro’) matches one of the categories required by the content. Authorization is granted.
-   **11.** Serve File: The Go API handler executes the success path. It maps the requested URL path (e.g., `/posts/week0001`) to the corresponding static file path (e.g., public/posts/week0001/index.html) and calls `http.ServeFile`.
-   **12** HTML/Content: The Go server streams the content of the authorized static HTML file from the filesystem back to the browser as the HTTP response.

### Permissions Map

Restricted content can be accessed only if this condition is true: User's `plan` matches the post's front-matter `categories`.

As we saw in step 8 of the process above, the guard checks the requested path against its cached plan map. This map is the `permissions` map.

The permissions map is generated once:

```go
type ContentGuard struct {
	permissions map[string][]string
	mu          sync.RWMutex
}

// Global variable contentGuard initializes an empty permissions map
var contentGuard = ContentGuard{permissions: make(map[string][]string)}

// This function populates the permissions map
func (cg *ContentGuard) Init() {
    // ...
}
```

If a new post is added, the permissions map is not updated. In order to update the permissions map everytime a new post is added, we need to change the way GitHub Actions builds the Hugo site. For information about building, check [Deploy](../deploy/).

## Where Go API gets content/posts/

Go API has to create a permissions map. It has to walk content/posts/. In my development environment, that directory is in frontend/content/posts/. But in production, the directory is in GitHub, right? So, how Go API generate the permissions map? 

This is a crucial architecture question that requires you to differentiate between the **build phase** and the **runtime phase** of your application.

Since the Go API is responsible for the content guard, it must know the access rules at runtime. Because your source files (`.md` files) are not available to the Go service in production (they are only in your Git repository), you cannot walk the `content/posts/` directory at runtime in the Cloud Run service.

The solution is to **decouple the static content from the runtime configuration** by introducing an intermediate step during your build process.

Here is the correct workflow for both development and production:

### 1\. Development Environment Workflow

In your development environment, the Go API can read the files directly, which is why your current setup works:

1.  **Go API Startup (`main.go`):** The Go binary runs inside the `backend` container.
2.  **Mapping Directory:** The `main.go` file defines `ContentRoot = "../frontend/content/posts"`.
3.  **Local Read:** The Go program is able to traverse its local filesystem, go up one directory, and find the posts directory to read the Markdown front matter (where the access plan is specified).
4.  **Result:** The Go API builds the in-memory permissions map.

### 2\. Production (Cloud Run) Workflow

In production, the Go container is isolated. It only contains the compiled Go binary and its dependencies. It does not have access to your Hugo source files.

The Go API must be updated to read the permissions map from a file or a database that is packaged with the container.

#### **Solution: Generate a Configuration File During the Build**

The best practice is to generate a dedicated JSON or TOML configuration file that holds the permissions map and package it with the Go service container.

#### **Step A: Introduce a Build Step (Hugo Build)**

You need a script or a Hugo build step to scan the `content/posts/` directory and extract the access plan from the front matter of every Markdown file.

**Example Script Logic (Conceptual)**:

```bash
#!/bin/bash
# Script to run during your CI/CD build before the Go Container is built

# 1. Initialize empty JSON config
echo '{"permissions": {}}' > permissions.json

# 2. Iterate over all posts
for file in frontend/content/posts/*.md; do
  # Extract the path used by the Go API (e.g., /posts/week0001)
  POST_PATH=$(basename "$file" .md | sed 's/index//') # Generates /posts/week0001
  
  # Extract the 'plan' requirement from the front matter (e.g., requires: [basic, pro])
  REQUIRED_PLANS=$(grep -E '^requires:' "$file" | cut -d '[' -f2 | cut -d ']' -f1 | tr -d ' ')
  
  # Append to JSON config
  # (Actual JSON manipulation is more complex, but this is the concept)
  # Permissions['/posts/week0001'] = ['basic', 'pro']
done

# 3. Save permissions.json
```

#### **Step B: Package the Config File**

In your `backend/Containerfile` (the Dockerfile for your Go API), you must now copy this generated `permissions.json` file into the final image:

```dockerfile
# backend/Containerfile
# ... (building and compiling Go binary)

# Stage 2: Final image
FROM alpine:latest
# ...
WORKDIR /app
COPY --from=builder /path/to/go/binary /app/go-server

# COPY THE GENERATED CONFIG FILE INTO THE IMAGE
# This file was generated in your CI/CD pipeline and placed here.
COPY permissions.json /app/permissions.json 

CMD ["/app/go-server", "--config=/app/permissions.json"]
```

#### **Step C: Update `backend/main.go` (Go Runtime)**

Your Go application will change from walking the local filesystem to loading the config file it finds packaged inside its own container:

```go
// backend/main.go

// CHANGE 1: New path constant for the config file inside the container
const PermissionsConfigPath = "/app/permissions.json" 

// CHANGE 2: Update the ContentGuard initialization logic
func main() {
    // ... setup Firebase/Firestore/GCS clients ...

    if os.Getenv("ENV") == "production" {
        // PRODUCTION: Load map from the packaged JSON file
        err := contentGuard.LoadFromFile(PermissionsConfigPath)
        if err != nil {
            log.Fatalf("Failed to load permissions config: %v", err)
        }
    } else {
        // DEVELOPMENT: Use old logic to walk local filesystem
        err := contentGuard.WalkLocalContent(ContentRoot)
        if err != nil {
            log.Fatalf("Failed to walk local content: %v", err)
        }
    }

    log.Printf("Initializing Content Guard... %d paths loaded.", len(contentGuard.permissions))
    // ... start server ...
}

// NOTE: You will need to implement the LoadFromFile and WalkLocalContent methods
// in your ContentGuard struct.
```

By decoupling the file discovery (which happens during the CI/CD build) from the permission enforcement (which happens during Cloud Run runtime), you ensure the Go API is always using the correct access rules without needing to access your source code repository.
