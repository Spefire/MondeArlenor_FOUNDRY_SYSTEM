/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class ArlenorActor extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();
    
    // Prepare items
    if (this.type == 'character') {
      this._prepareCharacterHealth(this, true);
    }
    if (this.type == 'creature') {
      this._prepareCharacterHealth(this, false);
    }
  }

  /**
   * Update health stats.
   *
   * @param {Object} actor The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterHealth(actor, withRaces = false) {
    const data = actor.system;

    const caracts = data.caracts;
    const safe = data.healthLevels.safe;
    const injured = data.healthLevels.injured;
    const underdeath = data.healthLevels.underdeath;

    // Assign and return
    safe.max = 2;
    injured.max = 2;
    underdeath.max = 2;

    if (withRaces) {
      const race = data.attributes.race;
      const races = data.races;

      if (race === races[1].code
        || race === races[4].code) {
        safe.max = 1;
      }
      if (race === races[2].code
        || race === races[5].code) {
        safe.max = 3;
      }
    }

    if (caracts.ten.value === 1) {
      safe.max = 1;
    } else if (caracts.ten.value === 5) {
      safe.max = 3;
    }

    data.health.max = safe.max + injured.max + underdeath.max;
  }
}