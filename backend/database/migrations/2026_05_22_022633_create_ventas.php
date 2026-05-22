<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clientes_id')->nullable()->constrained('clientes');
            $table->foreignId('usuarios_id')->constrained('usuarios');
            $table->dateTime('fecha')->nullable();
            $table->decimal('total', 10, 2)->default(0);
            $table->string('metodo_pago', 50)->nullable();
            $table->string('estado', 50)->default('pagado');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ventas');
    }
};
