import re

path = "admin.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

orig = html

# 1. Add an adminHeaders() helper right before the login() function.
helper = (
    "function adminHeaders(extra){\n"
    "  var h = extra ? Object.assign({}, extra) : {};\n"
    "  h['Authorization'] = 'Bearer ' + (sessionStorage.getItem('adminToken') || '');\n"
    "  return h;\n"
    "}\n\n"
    "function login(){"
)
count = html.count("function login(){")
assert count == 1, f"expected exactly 1 match for login() start, found {count}"
html = html.replace("function login(){", helper, 1)

# 2. Store the token alongside the existing adminLoggedIn flag on successful login.
old = "sessionStorage.setItem('adminLoggedIn','true');"
count = html.count(old)
assert count == 1, f"expected exactly 1 match, found {count}"
html = html.replace(
    old,
    "sessionStorage.setItem('adminLoggedIn','true');\n        sessionStorage.setItem('adminToken', r.token || '');",
    1,
)

# 3. Clear the token on logout.
old = "sessionStorage.removeItem('adminLoggedIn');"
count = html.count(old)
assert count == 1, f"expected exactly 1 match, found {count}"
html = html.replace(
    old,
    "sessionStorage.removeItem('adminLoggedIn');\n  sessionStorage.removeItem('adminToken');",
    1,
)

# 4. Require a stored token (not just the flag) to auto-open the dashboard on reload.
old = "if(sessionStorage.getItem('adminLoggedIn')==='true'){"
count = html.count(old)
assert count == 1, f"expected exactly 1 match, found {count}"
html = html.replace(
    old,
    "if(sessionStorage.getItem('adminLoggedIn')==='true' && sessionStorage.getItem('adminToken')){",
    1,
)

# 5. Attach the Bearer token to every admin-* GET call (admin-dashboard-data).
old = "fetch('/api/admin-dashboard-data')"
count = html.count(old)
assert count == 3, f"expected exactly 3 matches, found {count}"
html = html.replace(old, "fetch('/api/admin-dashboard-data', {headers: adminHeaders()})")

# 6. Attach the Bearer token to every admin-* POST call. This deliberately does NOT
#    match admin-login's header line, which is formatted with a space ("headers: {...
old = "headers:{'Content-Type':'application/json'}"
count = html.count(old)
assert count == 5, f"expected exactly 5 matches, found {count}"
html = html.replace(old, "headers:adminHeaders({'Content-Type':'application/json'})")

assert html != orig, "no changes were made"
with open(path, "w", encoding="utf-8") as f:
    f.write(html)

print("admin.html patched successfully")
