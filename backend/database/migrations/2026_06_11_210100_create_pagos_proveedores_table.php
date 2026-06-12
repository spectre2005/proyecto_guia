<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos_proveedores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proveedores_id')->constrained('proveedores');
            $table->foreignId('compras_id')->constrained('compras')->onDelete('cascade');
            $table->foreignId('usuarios_id')->nullable()->constrained('usuarios');
            $table->dateTime('fecha');
            $table->decimal('monto', 10, 2);
            $table->string('metodo', 50);
            $table->string('referencia', 100)->nullable();
            $table->text('observacion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos_proveedores');
    }
};
