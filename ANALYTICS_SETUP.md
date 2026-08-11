# Vercel Web Analytics Setup

This document describes the Vercel Web Analytics configuration for the Alwaleed Philanthropies website.

## Implementation

Vercel Web Analytics has been successfully installed and configured for this project using the vanilla JavaScript approach, as this is a static HTML/CSS/JS website.

### Installed Packages

- `@vercel/analytics` (v1.1.1) - Vercel Web Analytics package
- `@vercel/speed-insights` (latest) - Vercel Speed Insights package

### Configuration Files

1. **package.json** - Contains analytics dependencies and project scripts
2. **vercel.json** - Vercel platform configuration with analytics enabled
3. **.htmlhintrc** - HTML linting configuration

### Analytics Integration

Both main HTML files have been updated with Vercel Analytics:

#### index.html
- Added Vercel Web Analytics tracking script
- Added Vercel Speed Insights script
- Scripts are loaded with `defer` attribute for optimal performance

#### portal.html
- Added Vercel Web Analytics tracking script
- Added Vercel Speed Insights script
- Scripts are loaded with `defer` attribute for optimal performance

### How It Works

The implementation uses the vanilla JavaScript approach recommended by Vercel:

```html
<!-- Vercel Web Analytics -->
<script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>

<!-- Vercel Speed Insights -->
<script>
    window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
</script>
<script defer src="/_vercel/speed-insights/script.js"></script>
```

When deployed on Vercel:
1. The `/_vercel/insights/script.js` path is automatically served by Vercel's platform
2. Analytics data is collected and sent to Vercel's servers
3. Data can be viewed in the Vercel dashboard under the Analytics tab

### Verification

To verify that analytics are working:

1. Deploy the site to Vercel
2. Navigate to your Vercel project dashboard
3. Click on "Analytics" in the sidebar
4. After deployment and some visitor traffic, you should see analytics data

### Development

For local development:
```bash
npm run dev
```

This will start a local HTTP server on port 3000.

### Linting

To lint HTML files:
```bash
npm run lint
```

### Notes

- Analytics will only function when the site is deployed on Vercel
- Local development will not send analytics data
- The scripts are loaded with `defer` to prevent blocking page rendering
- Both Web Analytics and Speed Insights are configured for comprehensive tracking

### References

- [Vercel Web Analytics Documentation](https://vercel.com/docs/analytics/quickstart)
- [Vercel Speed Insights Documentation](https://vercel.com/docs/speed-insights)
