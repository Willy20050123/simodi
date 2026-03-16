const mariadb = require("mariadb");

(async () => {
  try {
    const pool = mariadb.createPool({
      host: "127.0.0.1",
      port: 3306,
      user: "simodi",
      password: "n0ts0s3cur3",
      database: "simodi",
      connectionLimit: 2,
    });

    const conn = await pool.getConnection();
    const rows = await conn.query("SELECT 1 AS ok");
    console.log(rows);
    conn.release();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

