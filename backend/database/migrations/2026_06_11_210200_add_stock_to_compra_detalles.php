<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('compra_detalles', function (Blueprint $table) {
            $table->foreignId('stocks_id')
                ->nullable()
                ->after('productos_id')
                ->constrained('stocks');
        });
    }

    public function down(): void
    {
        Schema::table('compra_detalles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('stocks_id');
        });
    }
};
