import { supabaseAdmin } from '../src/config/supabase';

const sql = `
CREATE OR REPLACE FUNCTION get_event_lat_lng(event_id UUID)
RETURNS TABLE (lat DOUBLE PRECISION, lng DOUBLE PRECISION) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Y(location::geometry) AS lat,
    ST_X(location::geometry) AS lng
  FROM events
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;
`;

async function createFunction() {
  try {
    // Execute SQL directly using raw query
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
      sql_query: sql 
    });
    
    if (error) {
      console.error('Error creating function:', error);
      process.exit(1);
    }
    
    console.log('Function created successfully!');
    console.log('Result:', data);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createFunction();
