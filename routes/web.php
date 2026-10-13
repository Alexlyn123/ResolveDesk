<?php

use Illuminate\Support\Facades\Route;

// The React application owns every non-API URL. Laravel only serves the shell.
Route::view('/{any?}', 'app')
    ->where('any', '^(?!api/|sanctum/|up$|build/|storage/).*$');
