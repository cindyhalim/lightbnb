const { Pool } = require('pg');
const properties = require('./json/properties.json');
const users = require('./json/users.json');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
  // port: '3000'
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `SELECT * FROM users WHERE email = $1;`
  const values = [email];
  return pool.query(queryString, values)
    .then(res => res.rows[0])
    .catch(err => console.log('query error', err.stack))

  // let user;
  // for (const userId in users) {
  //   user = users[userId];
  //   if (user.email.toLowerCase() === email.toLowerCase()) {
  //     break;
  //   } else {
  //     user = null;
  //   }
  // }
  // return Promise.resolve(user);
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `SELECT * FROM users WHERE id = $1`
  const values = [id]
  return pool.query(queryString, values)
    .then(res => res.rows[0])
    .catch(err => console.log('query error', err.stack))
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const values = [user.name, user.email, user.password]
  const queryString = `INSERT INTO users(name, email, password) VALUES ($1, $2, $3) RETURNING *`
  return pool.query(queryString, values)
  .then(res => res.rows[0])
  .catch(err => console.log('query error', err.stack))
  // const userId = Object.keys(users).length + 1;
  // user.id = userId;
  // users[userId] = user;
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `SELECT reservations.*, properties.*
  FROM reservations
  JOIN properties ON properties.id = reservations.property_id
JOIN property_reviews ON properties.id = property_reviews.property_id
WHERE reservations.end_date < now()::date AND reservations.guest_id = $1
GROUP BY reservations.id, properties.id, property_reviews.id
ORDER BY reservations.start_date
LIMIT $2`;
  const values = [guest_id, limit];
  return pool.query(queryString, values)
    .then(res => res.rows)
    .catch(err => console.log('query error', err.stack))
  // return getAllProperties(null, 2);
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */


const getAllProperties = function (options, limit = 10) {
    // 1
    const queryParams = [];
    // 2
    let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
    `;
  
    // 3
    if (options.city) {
      queryParams.push(`%${options.city}%`);
      queryString += `WHERE city LIKE $${queryParams.length} `;
    } 

    if (options.owner_id) {
      queryParams.push(parseInt(options.owner_id));
      queryString += `WHERE owner_id = $${queryParams.length}`
    }

    if (options.minimum_price_per_night && options.maximum_price_per_night) {
      queryParams.push(parseInt(options.minimum_price_per_night));
      queryParams.push(parseInt(options.maximum_price_per_night));
      queryString += `WHERE cost_per_night > $${queryParams.length - 1} AND cost_per_night < $${queryParams.length}`;
    }

    // 4
    queryString += `
    GROUP BY properties.id`

    if (options.minimum_rating) {
      queryParams.push(parseInt(options.minimum_rating));
      queryString += ` HAVING AVG(property_reviews.rating) >= $${queryParams.length}`
    }

    queryParams.push(limit);
    queryString += `
     ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;

    let regex = /WHERE/g
    let findWhere = queryString.match(regex);
    if (findWhere) {
      if (findWhere.length > 1) {
      queryString = queryString.replace(regex, 'AND')
      queryString = queryString.replace(/AND/, 'WHERE')
      }
    };


    // // 5
    console.log(queryString, queryParams);
  
    // 6
    return pool.query(queryString, queryParams)
    .then(res => res.rows);

  // const limitedProperties = {};
  // for (let i = 1; i <= limit; i++) {
  //   limitedProperties[i] = properties[i];
  // }
  // return Promise.resolve(limitedProperties);
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;
