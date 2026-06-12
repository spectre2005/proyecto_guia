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
        if (!Schema::hasTable('materiales')) {
            Schema::create('materiales', function (Blueprint $table) {
                $table->id();
                $table->string('nombre', 100)->unique();
                $table->timestamps();
            });
        }

        if (!Schema::hasColumn('productos', 'materiales_id')) {
            Schema::table('productos', function (Blueprint $table) {
                $table->foreignId('materiales_id')
                    ->nullable()
                    ->after('marcas_id')
                    ->constrained('materiales')
                    ->nullOnDelete();
            });
        } else {
            Schema::table('productos', function (Blueprint $table) {
                $table->foreign('materiales_id')
                    ->references('id')
                    ->on('materiales')
                    ->nullOnDelete();
            });
        }

        if (!Schema::hasColumn('productos', 'genero')) {
            Schema::table('productos', function (Blueprint $table) {
                $table->string('genero', 50)
                    ->nullable()
                    ->after('estado');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('productos', 'materiales_id')) {
            Schema::table('productos', function (Blueprint $table) {
                $table->dropForeign(['materiales_id']);
                $table->dropColumn('materiales_id');
            });
        }

        Schema::dropIfExists('materiales');
    }
};
