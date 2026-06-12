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
        if (Schema::hasTable('productos')) {
            return;
        }

        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('categorias_id')->constrained('categorias');
            $table->foreignId('marcas_id')->nullable()->constrained('marcas');
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();
            $table->string('imagen')->nullable();
            $table->boolean('estado')->default(true);
            $table->string('genero', 50)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
