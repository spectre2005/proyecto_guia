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
        Schema::create('stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('productos_id')->constrained('productos')->onDelete('cascade');
            $table->foreignId('tallas_id')->nullable()->constrained('tallas');
            $table->foreignId('colores_id')->nullable()->constrained('colores');
            $table->decimal('precio', 10, 2);
            $table->string('codigo', 8)->unique();
            $table->integer('cantidad')->default(0);
            $table->integer('stock_minimo')->default(5);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stocks');
    }
};
