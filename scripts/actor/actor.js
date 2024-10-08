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
  _prepareCharacterHealth(actor, isPJ = false) {
    const data = actor.system;
    const caracts = data.caracts;

    if (isPJ) {
      data.health.max = 5 + Math.floor(data.level / 2);
    } else {
      data.health.max = 5;
    }

    if (caracts.ten.value === 1) {
      data.health.max -= 1;
    } else if (caracts.ten.value > 3) {
      data.health.max += 1;
    }
  }
}