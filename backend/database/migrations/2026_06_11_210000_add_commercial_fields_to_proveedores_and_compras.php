<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proveedores', function (Blueprint $table) {
            $table->string('contacto', 150)->nullable()->after('nombre_empresa');
            $table->string('email', 150)->nullable()->after('telefono');
            $table->unsignedInteger('dias_credito')->default(0)->after('direccion');
            $table->boolean('estado')->default(true)->after('dias_credito');
            $table->text('notas')->nullable()->after('estado');
        });

        Schema::table('compras', function (Blueprint $table) {
            $table->string('numero_documento', 50)->nullable()->after('fecha');
            $table->date('fecha_vencimiento')->nullable()->after('numero_documento');
            $table->decimal('monto_pagado', 10, 2)->default(0)->after('total');
            $table->string('estado_pago', 20)->default('pendiente')->after('monto_pagado');
            $table->text('observaciones')->nullable()->after('estado_pago');
        });

        DB::table('compras')->update([
            'monto_pagado' => DB::raw('total'),
            'estado_pago' => 'pagado',
        ]);
    }

    public function down(): void
    {
        Schema::table('compras', function (Blueprint $table) {
            $table->dropColumn([
                'numero_documento',
                'fecha_vencimiento',
                'monto_pagado',
                'estado_pago',
                'observaciones',
            ]);
        });

        Schema::table('proveedores', function (Blueprint $table) {
            $table->dropColumn([
                'contacto',
                'email',
                'dias_credito',
                'estado',
                'notas',
            ]);
        });
    }
};
