import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Starting database seeding...\n');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const demoPassword = await bcrypt.hash('demo123', 10);

  console.log('👥 Creating sample users...');
  const { data: adminUser } = await supabase
    .from('users')
    .upsert({
      username: 'superadmin',
      email: 'admin@legacy.com',
      password_hash: adminPassword,
      full_name: 'Super Administrator',
      country: 'Global',
      role: 'Super Admin',
      xp_total: 9999,
      bio: 'Platform administrator with full access to all features and content management capabilities.',
      sports_role: 'Administrator',
      profile_unlocked: true,
      email_verified: true
    }, { onConflict: 'username' })
    .select()
    .single();

  const { data: demoUser } = await supabase
    .from('users')
    .upsert({
      username: 'demo_user',
      email: 'demo@legacy.com',
      password_hash: demoPassword,
      full_name: 'Demo User',
      country: 'Brazil',
      role: 'Member',
      xp_total: 500,
      bio: 'Passionate athlete learning about Web3 and blockchain technology to revolutionize sports engagement.',
      sports_role: 'Athlete',
      profile_unlocked: true,
      email_verified: true,
      telegram: '@demo_user',
      streak_count: 3
    }, { onConflict: 'username' })
    .select()
    .single();

  console.log('✅ Created users: superadmin, demo_user\n');

  console.log('📚 Creating sample courses...');
  const { data: course1 } = await supabase
    .from('courses')
    .insert({
      title: {
        en: 'Introduction to Blockchain',
        pt: 'Introdução ao Blockchain',
        es: 'Introducción a Blockchain',
        fr: 'Introduction à la Blockchain',
        it: 'Introduzione alla Blockchain',
        de: 'Einführung in Blockchain'
      },
      description: {
        en: 'Learn the fundamentals of blockchain technology and how it\'s revolutionizing sports',
        pt: 'Aprenda os fundamentos da tecnologia blockchain e como está revolucionando os esportes',
        es: 'Aprende los fundamentos de la tecnología blockchain y cómo está revolucionando los deportes',
        fr: 'Apprenez les fondamentaux de la technologie blockchain et comment elle révolutionne le sport',
        it: 'Impara i fondamenti della tecnologia blockchain e come sta rivoluzionando lo sport',
        de: 'Lernen Sie die Grundlagen der Blockchain-Technologie und wie sie den Sport revolutioniert'
      },
      order: 1,
      xp_threshold: 0,
      published: true
    })
    .select()
    .single();

  if (course1) {
    const { data: module1 } = await supabase
      .from('modules')
      .insert({
        course_id: course1.id,
        title: {
          en: 'Blockchain Basics',
          pt: 'Fundamentos do Blockchain',
          es: 'Fundamentos de Blockchain',
          fr: 'Bases de la Blockchain',
          it: 'Basi della Blockchain',
          de: 'Blockchain-Grundlagen'
        },
        description: {
          en: 'Understanding what blockchain is and how it works',
          pt: 'Compreendendo o que é blockchain e como funciona',
          es: 'Comprender qué es blockchain y cómo funciona',
          fr: 'Comprendre ce qu\'est la blockchain et comment elle fonctionne',
          it: 'Capire cos\'è la blockchain e come funziona',
          de: 'Verstehen, was Blockchain ist und wie es funktioniert'
        },
        order: 1
      })
      .select()
      .single();

    if (module1) {
      await supabase.from('lessons').insert([
        {
          module_id: module1.id,
          title: {
            en: 'What is Blockchain?',
            pt: 'O que é Blockchain?',
            es: '¿Qué es Blockchain?',
            fr: 'Qu\'est-ce que la Blockchain?',
            it: 'Cos\'è la Blockchain?',
            de: 'Was ist Blockchain?'
          },
          content: {
            en: 'Blockchain is a distributed ledger technology that enables secure, transparent, and immutable record-keeping...',
            pt: 'Blockchain é uma tecnologia de contabilidade distribuída que permite manutenção de registros segura, transparente e imutável...',
            es: 'Blockchain es una tecnología de contabilidad distribuida que permite el mantenimiento de registros seguro, transparente e inmutable...',
            fr: 'La blockchain est une technologie de registre distribué qui permet une tenue de registres sécurisée, transparente et immuable...',
            it: 'La blockchain è una tecnologia di registro distribuito che consente una tenuta dei registri sicura, trasparente e immutabile...',
            de: 'Blockchain ist eine verteilte Ledger-Technologie, die sichere, transparente und unveränderliche Aufzeichnungen ermöglicht...'
          },
          xp_reward: 20,
          xp_threshold: 0,
          order: 1,
          estimated_time: 10
        },
        {
          module_id: module1.id,
          title: {
            en: 'How Blockchain Works',
            pt: 'Como Funciona o Blockchain',
            es: 'Cómo Funciona Blockchain',
            fr: 'Comment Fonctionne la Blockchain',
            it: 'Come Funziona la Blockchain',
            de: 'Wie Blockchain Funktioniert'
          },
          content: {
            en: 'Blockchain works by creating blocks of data that are linked together in a chain...',
            pt: 'Blockchain funciona criando blocos de dados que são vinculados em uma cadeia...',
            es: 'Blockchain funciona creando bloques de datos que están vinculados en una cadena...',
            fr: 'La blockchain fonctionne en créant des blocs de données qui sont liés ensemble dans une chaîne...',
            it: 'La blockchain funziona creando blocchi di dati che sono collegati insieme in una catena...',
            de: 'Blockchain funktioniert durch die Erstellung von Datenblöcken, die in einer Kette miteinander verbunden sind...'
          },
          xp_reward: 25,
          xp_threshold: 0,
          order: 2,
          estimated_time: 15
        }
      ]);
    }
  }

  console.log('✅ Created course: Introduction to Blockchain\n');

  console.log('📝 Creating sample blog posts...');
  if (adminUser) {
    await supabase.from('blog_posts').insert([
      {
        title: {
          en: 'The Future of Fan Engagement in Web3',
          pt: 'O Futuro do Engajamento dos Fãs no Web3',
          es: 'El Futuro del Compromiso de Fans en Web3',
          fr: 'L\'Avenir de l\'Engagement des Fans dans le Web3',
          it: 'Il Futuro dell\'Engagement dei Fan nel Web3',
          de: 'Die Zukunft des Fan-Engagements im Web3'
        },
        excerpt: {
          en: 'Discover how Web3 is transforming fan engagement',
          pt: 'Descubra como Web3 está transformando o engajamento dos fãs',
          es: 'Descubre cómo Web3 está transformando el compromiso de los fans',
          fr: 'Découvrez comment Web3 transforme l\'engagement des fans',
          it: 'Scopri come Web3 sta trasformando l\'engagement dei fan',
          de: 'Entdecken Sie, wie Web3 das Fan-Engagement transformiert'
        },
        content: {
          en: '<h2>Introduction</h2><p>Web3 technology is revolutionizing how fans interact with their favorite teams and athletes. Through NFTs, DAOs, and blockchain-based loyalty programs, sports organizations can create deeper, more meaningful connections with their fanbase.</p><h2>Key Benefits</h2><p>1. Direct ownership of digital collectibles<br/>2. Transparent voting and governance<br/>3. Immutable proof of attendance and achievements<br/>4. New revenue streams for athletes and teams</p>',
          pt: '<h2>Introdução</h2><p>A tecnologia Web3 está revolucionando como os fãs interagem com seus times e atletas favoritos...</p>',
          es: '<h2>Introducción</h2><p>La tecnología Web3 está revolucionando cómo los fans interactúan con sus equipos y atletas favoritos...</p>',
          fr: '<h2>Introduction</h2><p>La technologie Web3 révolutionne la façon dont les fans interagissent avec leurs équipes et athlètes préférés...</p>',
          it: '<h2>Introduzione</h2><p>La tecnologia Web3 sta rivoluzionando come i fan interagiscono con le loro squadre e atleti preferiti...</p>',
          de: '<h2>Einleitung</h2><p>Web3-Technologie revolutioniert, wie Fans mit ihren Lieblingsteams und -athleten interagieren...</p>'
        },
        category: 'Web3',
        author_id: adminUser.id,
        xp_reward: 15,
        registered_only: false,
        published: true,
        published_at: new Date().toISOString(),
        views: 1234,
        likes: 89
      },
      {
        title: {
          en: 'Understanding Smart Contracts in Sports',
          pt: 'Compreendendo Contratos Inteligentes no Esporte',
          es: 'Comprendiendo Contratos Inteligentes en Deportes',
          fr: 'Comprendre les Contrats Intelligents dans le Sport',
          it: 'Comprendere i Contratti Intelligenti nello Sport',
          de: 'Smart Contracts im Sport Verstehen'
        },
        excerpt: {
          en: 'Learn how smart contracts are changing sports agreements',
          pt: 'Aprenda como contratos inteligentes estão mudando acordos esportivos',
          es: 'Aprende cómo los contratos inteligentes están cambiando los acuerdos deportivos',
          fr: 'Apprenez comment les contrats intelligents changent les accords sportifs',
          it: 'Scopri come i contratti intelligenti stanno cambiando gli accordi sportivi',
          de: 'Erfahren Sie, wie Smart Contracts Sportverträge verändern'
        },
        content: {
          en: '<h2>What are Smart Contracts?</h2><p>Smart contracts are self-executing contracts with terms directly written into code. In sports, they can automate everything from ticket sales to sponsorship agreements.</p><h2>Use Cases in Sports</h2><p>1. Automated athlete payments<br/>2. Ticketing and access control<br/>3. Sponsorship deals execution<br/>4. Prize distribution in tournaments</p>',
          pt: '<h2>O que são Contratos Inteligentes?</h2><p>Contratos inteligentes são contratos auto-executáveis com termos escritos diretamente em código...</p>',
          es: '<h2>¿Qué son los Contratos Inteligentes?</h2><p>Los contratos inteligentes son contratos autoejecutables con términos escritos directamente en código...</p>',
          fr: '<h2>Qu\'est-ce que les Contrats Intelligents?</h2><p>Les contrats intelligents sont des contrats auto-exécutants avec des termes écrits directement dans le code...</p>',
          it: '<h2>Cosa sono i Contratti Intelligenti?</h2><p>I contratti intelligenti sono contratti auto-eseguibili con termini scritti direttamente nel codice...</p>',
          de: '<h2>Was sind Smart Contracts?</h2><p>Smart Contracts sind selbstausführende Verträge mit Bedingungen, die direkt in Code geschrieben sind...</p>'
        },
        category: 'Blockchain',
        author_id: adminUser.id,
        xp_reward: 20,
        registered_only: false,
        published: true,
        published_at: new Date().toISOString(),
        views: 892,
        likes: 67
      }
    ]);
  }

  console.log('✅ Created 2 blog posts\n');

  console.log('🏠 Creating forum rooms...');
  await supabase.from('forum_rooms').insert([
    {
      name: {
        en: 'General Discussion',
        pt: 'Discussão Geral',
        es: 'Discusión General',
        fr: 'Discussion Générale',
        it: 'Discussione Generale',
        de: 'Allgemeine Diskussion'
      },
      description: {
        en: 'General topics about Web3 and sports',
        pt: 'Tópicos gerais sobre Web3 e esportes',
        es: 'Temas generales sobre Web3 y deportes',
        fr: 'Sujets généraux sur Web3 et le sport',
        it: 'Argomenti generali su Web3 e sport',
        de: 'Allgemeine Themen zu Web3 und Sport'
      },
      is_private: false
    },
    {
      name: {
        en: 'Blockchain Technology',
        pt: 'Tecnologia Blockchain',
        es: 'Tecnología Blockchain',
        fr: 'Technologie Blockchain',
        it: 'Tecnologia Blockchain',
        de: 'Blockchain-Technologie'
      },
      description: {
        en: 'Deep dives into blockchain technology',
        pt: 'Mergulhos profundos na tecnologia blockchain',
        es: 'Inmersiones profundas en la tecnología blockchain',
        fr: 'Plongées profondes dans la technologie blockchain',
        it: 'Approfondimenti sulla tecnologia blockchain',
        de: 'Tiefe Einblicke in die Blockchain-Technologie'
      },
      is_private: false
    }
  ]);

  console.log('✅ Created forum rooms\n');

  console.log('✅ Database seeding completed!\n');
  console.log('═══════════════════════════════════════');
  console.log('🔑 Default Login Credentials:');
  console.log('═══════════════════════════════════════');
  console.log('\n👑 Admin Account:');
  console.log('   Username: superadmin');
  console.log('   Password: admin123');
  console.log('   XP: 9999');
  console.log('\n👤 Demo User:');
  console.log('   Username: demo_user');
  console.log('   Password: demo123');
  console.log('   XP: 500');
  console.log('\n═══════════════════════════════════════\n');
}

seed()
  .then(() => {
    console.log('✨ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  });
