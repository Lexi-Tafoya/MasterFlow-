MASTERFLOW REQUEST TEMPLATES FIX

Replace exactly these two files in your MasterFlow project:

1. admin-templates.html
2. assets/js/pages/admin-templates.js

Do not change templates.js, store.js, layout.js, or styles.css.

After replacing the files:
1. Save All in VS Code.
2. Hard-refresh the browser with Ctrl+Shift+R.
3. Open Administrator -> Request templates.
4. The built-in request templates should appear immediately.

The previous admin-templates.js expected page elements that did not exist and called a missing renderList() function. This replacement uses only the elements in the corrected HTML and restores template listing, editing, saving, adding/removing fields, search, and reset.
