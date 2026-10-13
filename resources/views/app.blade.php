<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="ResolveDesk brings customer concerns, team responsibilities, and resolution updates into one accountable workflow.">
        <meta name="theme-color" content="#0B1322">
        <title>{{ config('app.name', 'ResolveDesk') }}</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        @viteReactRefresh
        @vite('resources/js/main.jsx')
    </head>
    <body>
        <div id="root"></div>
        <noscript>ResolveDesk needs JavaScript enabled to run.</noscript>
    </body>
</html>
