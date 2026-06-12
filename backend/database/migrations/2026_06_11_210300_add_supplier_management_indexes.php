<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proveedores', function (Blueprint $table) {
            $table->index('estado');
        });

        Schema::table('compras', function (Blueprint $table) {
            $table->index(['estado_pago', 'fecha_vencimiento']);
        });

        Schema::table('pagos_proveedores', function (Blueprint $table) {
            $table->index(['proveedores_id', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::table('pagos_proveedores', function (Blueprint $table) {
            $table->dropIndex(['proveedores_id', 'fecha']);
        });

        Schema::table('compras', function (Blueprint $table) {
            $table->dropIndex(['estado_pago', 'fecha_vencimiento']);
        });

        Schema::table('proveedores', function (Blueprint $table) {
            $table->dropIndex(['estado']);
        });
    }
};
