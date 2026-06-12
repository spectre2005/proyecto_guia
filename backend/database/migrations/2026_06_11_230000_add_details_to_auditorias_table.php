<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('auditorias', function (Blueprint $table) {
            $table->string('registro_id', 100)
                ->nullable()
                ->after('tabla_afectada');
            $table->text('descripcion')
                ->nullable()
                ->after('registro_id');
            $table->string('ip', 45)
                ->nullable()
                ->after('descripcion');
            $table->index(['tabla_afectada', 'fecha']);
            $table->index(['accion', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::table('auditorias', function (Blueprint $table) {
            $table->dropIndex(['tabla_afectada', 'fecha']);
            $table->dropIndex(['accion', 'fecha']);
            $table->dropColumn(['registro_id', 'descripcion', 'ip']);
        });
    }
};
