# Site Functionality Test Plan Checksheet

Use this checksheet during manual testing of each release candidate.

- **Build tested:** ____________________
- **Environment:** Local / Staging / Production
- **Tester:** ____________________
- **Date:** ____________________

## 1) Core Access & Navigation
- [ ] Home page loads without errors.
- [ ] Header navigation links route to expected pages.
- [ ] Footer links open expected destinations.
- [ ] Browser refresh works on deep links (no unexpected 404 page).
- [ ] Mobile menu works on small screens.

## 2) Authentication
- [ ] User can sign up with valid information.
- [ ] Validation messages appear for missing/invalid fields.
- [ ] User can log in and is redirected to expected page.
- [ ] User can log out successfully.
- [ ] Protected routes block unauthenticated users.

## 3) Business Profiles / Listings
- [ ] Business list page loads and displays data.
- [ ] Search/filter controls return relevant results.
- [ ] Business detail page loads with complete profile data.
- [ ] Social links open correctly from business profile.
- [ ] Broken or missing business slug shows graceful error state.

## 4) Customer Features
- [ ] Customer profile page loads and saves edits.
- [ ] Favorites can be added from listing/detail pages.
- [ ] Favorites can be removed successfully.
- [ ] Favorite state remains correct after refresh/login cycle.

## 5) Admin / Management (if applicable)
- [ ] Admin can log in.
- [ ] Admin-only routes are protected from non-admin users.
- [ ] Admin can review/approve/reject pending items.
- [ ] Audit/status updates appear in UI after admin actions.

## 6) API & Error Handling
- [ ] Common API endpoints return expected success responses.
- [ ] UI handles API failures with readable error messages.
- [ ] Unauthorized requests return expected status (401/403).
- [ ] Not found routes/resources return expected status (404).

## 7) File Uploads / Media (if applicable)
- [ ] Logo/image upload accepts valid file types.
- [ ] File size limits are enforced with clear messaging.
- [ ] Uploaded media displays correctly in UI.

## 8) Accessibility & UX Basics
- [ ] All interactive elements are keyboard reachable.
- [ ] Form fields have visible labels and focus states.
- [ ] Color contrast is readable on key pages.
- [ ] Loading states/skeletons are shown where needed.

## 9) Cross-Browser / Responsive
- [ ] Verified in latest Chrome.
- [ ] Verified in latest Firefox.
- [ ] Verified in latest Safari (or WebKit equivalent).
- [ ] Layout remains usable on mobile viewport.
- [ ] Layout remains usable on tablet viewport.

## 10) Regression Smoke (High Priority)
- [ ] Create account → log in → browse businesses.
- [ ] Open business profile → click social link.
- [ ] Add favorite → remove favorite.
- [ ] Log out → protected page redirects to login.

## Notes / Defects
- Defect ID / Description / Severity / Owner / Status
- _________________________________________________
- _________________________________________________
- _________________________________________________

## Sign-off
- [ ] Ready for release
- [ ] Needs fixes before release

**Approver:** ____________________
