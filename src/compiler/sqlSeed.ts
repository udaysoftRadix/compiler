// Loaded into the fresh in-memory database before every SQL run, so users can
// start querying immediately.
export const SQL_SEED = `
CREATE TABLE Customers (
  customer_id INTEGER PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  age INTEGER,
  country TEXT
);
INSERT INTO Customers VALUES
  (1, 'John', 'Doe', 31, 'USA'),
  (2, 'Robert', 'Luna', 22, 'USA'),
  (3, 'David', 'Robinson', 22, 'UK'),
  (4, 'John', 'Reinhardt', 25, 'UK'),
  (5, 'Betty', 'Doe', 28, 'UAE');

CREATE TABLE Orders (
  order_id INTEGER PRIMARY KEY,
  item TEXT,
  amount INTEGER,
  customer_id INTEGER REFERENCES Customers (customer_id)
);
INSERT INTO Orders VALUES
  (1, 'Keyboard', 400, 4),
  (2, 'Mouse', 300, 4),
  (3, 'Monitor', 12000, 3),
  (4, 'Keyboard', 400, 1),
  (5, 'Mousepad', 250, 2);

CREATE TABLE Shippings (
  shipping_id INTEGER PRIMARY KEY,
  status TEXT,
  customer INTEGER REFERENCES Customers (customer_id)
);
INSERT INTO Shippings VALUES
  (1, 'Pending', 2),
  (2, 'Pending', 4),
  (3, 'Delivered', 3),
  (4, 'Pending', 5),
  (5, 'Delivered', 1);
`;
