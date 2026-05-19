// ══════════════════════════════════════════
// SQUAD TEAM — Macro Calculator
// ══════════════════════════════════════════

const MacroCalc = {
  // Calcular macros de un alimento según cantidad
  calcFood(food, grams){
    const g = parseFloat(grams) || 0;
    const f = food.macrosPor100g;
    return {
      kcal:     Math.round(f.kcal     * g / 100),
      proteina: Math.round(f.proteina * g / 100 * 10) / 10,
      carbos:   Math.round(f.carbos   * g / 100 * 10) / 10,
      grasas:   Math.round(f.grasas   * g / 100 * 10) / 10,
    };
  },

  // Sumar macros de una comida
  calcMeal(items){
    return items.reduce((tot, item) => {
      const m = this.calcFood(item.food, item.grams);
      return {
        kcal:     tot.kcal     + m.kcal,
        proteina: Math.round((tot.proteina + m.proteina) * 10) / 10,
        carbos:   Math.round((tot.carbos   + m.carbos)   * 10) / 10,
        grasas:   Math.round((tot.grasas   + m.grasas)   * 10) / 10,
      };
    }, { kcal:0, proteina:0, carbos:0, grasas:0 });
  },

  // Sumar macros de todo el día
  calcDay(meals){
    return meals.reduce((tot, meal) => {
      const m = this.calcMeal(meal.items || []);
      return {
        kcal:     tot.kcal     + m.kcal,
        proteina: Math.round((tot.proteina + m.proteina) * 10) / 10,
        carbos:   Math.round((tot.carbos   + m.carbos)   * 10) / 10,
        grasas:   Math.round((tot.grasas   + m.grasas)   * 10) / 10,
      };
    }, { kcal:0, proteina:0, carbos:0, grasas:0 });
  },

  // Diferencia vs objetivo
  diff(current, target){
    return {
      kcal:     Math.round(target.kcal     - current.kcal),
      proteina: Math.round((target.proteina - current.proteina) * 10) / 10,
      carbos:   Math.round((target.carbos   - current.carbos)   * 10) / 10,
      grasas:   Math.round((target.grasas   - current.grasas)   * 10) / 10,
    };
  },

  // Sugerencias inteligentes para cuadrar macros
  suggest(diff){
    const suggestions = [];

    if(diff.proteina > 10){
      const g = Math.round(diff.proteina / 0.80); // whey 80% proteina
      suggestions.push({ text: `Faltan ${diff.proteina}g proteína`, action: `Agregar ${g}g de whey o ${Math.round(diff.proteina/0.31)}g pecho de pollo`, icon:'💪' });
    }
    if(diff.carbos > 15){
      const gArroz = Math.round(diff.carbos / 0.80);
      suggestions.push({ text: `Faltan ${diff.carbos}g de carbohidratos`, action: `Agregar ${gArroz}g arroz crudo o ${Math.round(diff.carbos/0.23)}g banana`, icon:'🍚' });
    }
    if(diff.grasas > 5){
      const gAce = Math.round(diff.grasas / 1.0);
      suggestions.push({ text: `Faltan ${diff.grasas}g de grasas`, action: `Agregar ${gAce}g aceite de oliva o ${Math.round(diff.grasas/0.50)}g almendras`, icon:'🥑' });
    }
    if(diff.proteina < -10){
      suggestions.push({ text: `Sobran ${Math.abs(diff.proteina)}g proteína`, action: 'Reducir la fuente de proteína de alguna comida', icon:'⚠️' });
    }
    if(diff.carbos < -20){
      suggestions.push({ text: `Sobran ${Math.abs(diff.carbos)}g de carbohidratos`, action: 'Reducir porción de arroz, avena o pasta', icon:'⚠️' });
    }
    if(diff.kcal > 200){
      suggestions.push({ text: `Faltan ${diff.kcal} kcal`, action: 'Agregá una comida más o aumentá porciones', icon:'🔥' });
    }
    if(diff.kcal < -150){
      suggestions.push({ text: `Excedés por ${Math.abs(diff.kcal)} kcal`, action: 'Reducí porciones o eliminá una comida', icon:'⚠️' });
    }
    if(!suggestions.length && Math.abs(diff.kcal) < 100){
      suggestions.push({ text: '¡Dieta perfectamente cuadrada!', action: 'Los macros están alineados con el objetivo', icon:'✅' });
    }
    return suggestions;
  },

  // Auto-cuadrar: distribuir alimentos en comidas para alcanzar objetivo
  autoCuadrar(target, numComidas = 4){
    const meals = [];
    const kcalPerMeal = Math.round(target.kcal / numComidas);
    const protPerMeal = Math.round(target.proteina / numComidas * 10) / 10;
    const carbsPerMeal = Math.round(target.carbos / numComidas * 10) / 10;
    const grPerMeal = Math.round(target.grasas / numComidas * 10) / 10;

    const mealNames = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Post-entreno', 'Antes de dormir'];

    for(let i = 0; i < numComidas; i++){
      const items = [];
      let remainProt = protPerMeal;
      let remainCarbs = carbsPerMeal;
      let remainGr = grPerMeal;

      // Proteína principal
      if(remainProt > 5){
        const pFood = FoodDB.getById(i % 2 === 0 ? 'pollo_pecho' : 'atun_lata');
        if(pFood){
          const g = Math.round(remainProt / (pFood.macrosPor100g.proteina/100));
          items.push({ food: pFood, grams: g });
          remainProt -= pFood.macrosPor100g.proteina * g / 100;
          remainCarbs -= pFood.macrosPor100g.carbos * g / 100;
          remainGr -= pFood.macrosPor100g.grasas * g / 100;
        }
      }
      // Carbohidrato
      if(remainCarbs > 10){
        const cFood = FoodDB.getById(i === 0 ? 'avena_cruda' : 'arroz_blanco_crudo');
        if(cFood){
          const g = Math.max(30, Math.round(remainCarbs / (cFood.macrosPor100g.carbos/100)));
          items.push({ food: cFood, grams: g });
        }
      }
      // Grasa
      if(remainGr > 3){
        const gFood = FoodDB.getById('aceite_oliva');
        if(gFood){
          const g = Math.round(remainGr / (gFood.macrosPor100g.grasas/100));
          items.push({ food: gFood, grams: Math.min(g, 20) }); // max 20g aceite
        }
      }

      meals.push({ name: mealNames[i] || `Comida ${i+1}`, items });
    }
    return meals;
  }
};
